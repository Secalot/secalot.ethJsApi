import hid from 'node-hid'
import os from 'os'
import crypto from 'crypto'

class SecalotTransportNodeHid {
  constructor () {
    this.U2FHID_PING = 0x80 | 0x01
    this.U2FHID_MSG = 0x80 | 0x03
    this.U2FHID_LOCK = 0x80 | 0x04
    this.U2FHID_INIT = 0x80 | 0x06
    this.U2FHID_WINK = 0x80 | 0x08
    this.U2FHID_SYNC = 0x80 | 0x3C
    this.U2FHID_ERROR = 0x80 | 0x3F
    this.U2FHID_VENDOR_FIRST = 0x80 | 0x40
    this.U2FHID_VENDOR_LAST = 0x80 | 0x7F

    this.U2FHID_BROADCAST_CID = 0xffffffff

    this.hidErrors = {
      0x00: 'No error',
      0x01: 'Invalid command',
      0x02: 'Invalid parameter',
      0x03: 'Invalid message length',
      0x04: 'Invalid message sequencing',
      0x05: 'Message has timed out',
      0x06: 'Channel busy',
      0x0a: 'Command requires channel lock',
      0x0b: 'SYNC command failed',
      0x7f: 'Other unspecified error'
    }

    this._channelID = 0xffffffff
  }

  static getConnectedDevices () {
    var devices = hid.devices().filter(function (deviceInfo) {
      if ((deviceInfo.interface === 0x01) &&
      (deviceInfo.vendorId === 0x1209) &&
      (deviceInfo.productId === 0x7000)) {
        return true
      }
      return false
    })

    return devices
  }

  async open (deviceInfo) {
    this.device = new hid.HID(deviceInfo.path)
    await this._init()
  }

  close () {
    this.device.close()
  }

  _sendHidFrame (data) {
    var array = [...data]
    if (os.platform() === 'win32') {
      array.unshift(0)
    }
    this.device.write(array)
  }

  async _receiveHidFrame () {
    var that = this
    return new Promise(function (resolve, reject) {
      that.device.read(function (err, res) {
        if (err || !res) {
          reject(err)
        } else {
          var buffer = Buffer.from(res)
          resolve(buffer)
        }
      })
    })
  }

  async _init () {
    var nonce = crypto.pseudoRandomBytes(8)

    this._sendCommand(this.U2FHID_INIT, 0xFFFFFFFF, nonce)
    var response = await this._receiveResponse(this.U2FHID_INIT, 0xFFFFFFFF)

    var nonce2 = response.slice(0, 8)
    if (nonce.toString('hex') !== nonce2.toString('hex')) {
      throw new Error('Error initializing U2F HID device: incorrect nonce')
    }
    this._channelID = response.readUInt32BE(8)
  }

  _sendCommand (command, channelID, data) {
    var buffer = Buffer.alloc(64)
    buffer.fill(0)
    buffer.writeUInt32BE(channelID, 0)
    buffer.writeUInt8(command, 4)
    buffer.writeUInt16BE(data.length, 5)
    data.copy(buffer, 7); data = data.slice(buffer.length - 7)

    this._sendHidFrame(buffer)

    var seq = 0
    while (data.length > 0) {
      buffer.fill(0)
      buffer.writeUInt32BE(channelID, 0)
      buffer.writeUInt8(seq++, 4)
      data.copy(buffer, 5); data = data.slice(buffer.length - 5)
      if (seq > 0x80) {
        throw new Error('Protocol error.')
      }
      this._sendHidFrame(buffer)
    }
  }

  async _receiveNextFrame (channelID) {
    do {
      var frame = await this._receiveHidFrame()
      var receivedChannelId = frame.readUInt32BE(0)
      var cmd = frame.readUInt8(4)
    } while (receivedChannelId !== channelID)

    if (cmd === this.U2FHID_ERROR) {
      var errCode = frame.readUInt8(7)
      throw new Error(this.hidErrors[errCode] || this.hidErrors[0x7f])
    }

    return frame
  }

  async _receiveResponse (command, channelID) {
    var seq = 0
    var receivedBufs = []
    var receivedBytes = 0

    var frame = await this._receiveNextFrame(channelID)
    var cmd = frame.readUInt8(4)

    if ((cmd & 0x80) === 0) {
      throw new Error('Invalid U2F packet received.')
    }

    var toReceive = frame.readUInt16BE(5)
    receivedBufs[0] = frame.slice(7)
    receivedBytes += receivedBufs[0].length

    while (receivedBytes < toReceive) {
      frame = await this._receiveNextFrame(channelID)
      cmd = frame.readUInt8(4)

      if (cmd !== seq) {
        throw new Error('Invalid U2F packet received.')
      }

      seq++

      if (seq > 0x80) {
        throw new Error('Protocol error.')
      }

      receivedBufs[cmd + 1] = frame.slice(5)
      receivedBytes += receivedBufs[cmd + 1].length
    }

    return Buffer.concat(receivedBufs).slice(0, toReceive)
  }

  async sendApdu (apdu) {
    if (apdu.length > (255 - (8 + 32))) {
      throw new Error('APDU length too big.')
    }

    var offset = 0
    var wrappedApdu = Buffer.alloc(7 + 32 + 32 + 1 + 8 + apdu.length)
    var magic = Buffer.from('1122334455667788', 'hex')

    wrappedApdu[offset++] = 0x00
    wrappedApdu[offset++] = 0x02
    wrappedApdu[offset++] = 0x00
    wrappedApdu[offset++] = 0x00
    wrappedApdu[offset++] = 0x00
    wrappedApdu.writeUInt16BE(wrappedApdu.length - 7, offset)
    offset += 2
    wrappedApdu.fill(0, offset, offset + 64)
    offset += 64
    wrappedApdu[offset++] = apdu.length + 8
    magic.copy(wrappedApdu, offset)
    offset += 8
    apdu.copy(wrappedApdu, offset)

    this._sendCommand(this.U2FHID_MSG, this._channelID, wrappedApdu)
    var response = await this._receiveResponse(this.U2FHID_MSG, this._channelID)

    if (response.length < 2) {
      throw new Error('Invalid response APDU.')
    }

    if ((response[response.length - 2] !== 0x90) || (response[response.length - 1] !== 0x00)) {
      throw new Error('Invalid response APDU.')
    }

    response = response.slice(0, (response.length - 2))

    return response
  }
}

export default SecalotTransportNodeHid
