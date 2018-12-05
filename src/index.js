import SecalotTransportNodeHid from './secalotTransportNodeHid'

class SecalotEthApi {
  constructor (deviceInfo) {
    this.transport = new SecalotTransportNodeHid()
    this.deviceInfo = deviceInfo
  }

  static getConnectedDevices () {
    return SecalotTransportNodeHid.getConnectedDevices()
  }

  close () {
    this.transport.close()
  }

  async getInfo () {
    await this.transport.open(this.deviceInfo)

    try {
      var apdu = Buffer.from('80C40000', 'hex')

      var response = await this.transport.sendApdu(apdu)

      if ((response[response.length - 2] !== 0x90) || (response[response.length - 1] !== 0x00)) {
        throw new Error('Invalid APDU response.')
      }

      if (response.length !== 10) {
        throw new Error('Invalid APDU response.')
      }

      var info = {
        version: response[0].toString() + '.' + response[1].toString(),
        walletInitialized: (response[2] & 0x01) === 0x01,
        pinVerified: (response[2] & 0x02) === 0x02
      }
    } finally {
      this.transport.close()
    }

    return info
  }

  async getRandom (length) {
    if ((length === 0) || (length > 128)) {
      throw new Error('Invalid length.')
    }

    await this.transport.open(this.deviceInfo)

    try {
      var apdu = Buffer.from('80C0000000', 'hex')

      apdu[4] = length

      var response = await this.transport.sendApdu(apdu)

      if ((response[response.length - 2] !== 0x90) || (response[response.length - 1] !== 0x00)) {
        throw new Error('Invalid APDU response.')
      }

      if (response.length !== (length + 2)) {
        throw new Error('Invalid APDU response.')
      }

      response = response.slice(0, (response.length - 2))
    } finally {
      this.transport.close()
    }

    return response.toString('hex')
  }

  async initWallet (seed, pin) {
    seed = Buffer.from(seed, 'hex')
    pin = Buffer.from(pin, 'utf8')

    if ((seed.length < 32) || (seed.length > 64)) {
      throw new Error('Invalid seed length.')
    }

    if ((pin.length < 4) || (pin.length > 32)) {
      throw new Error('Invalid pin length.')
    }

    await this.transport.open(this.deviceInfo)

    try {
      var apdu = Buffer.alloc(5 + 2 + seed.length + pin.length)

      apdu[0] = 0x80
      apdu[1] = 0x20
      apdu[2] = 0x00
      apdu[3] = 0x00
      apdu[4] = 2 + pin.length + seed.length
      apdu[5] = pin.length
      pin.copy(apdu, 6, 0, pin.length)
      apdu[6 + pin.length] = seed.length
      seed.copy(apdu, 6 + pin.length + 1, 0, seed.length)

      var response = await this.transport.sendApdu(apdu)

      if (response.length !== 2) {
        throw new Error('Invalid APDU response.')
      }

      if ((response[0] !== 0x90) || (response[1] !== 0x00)) {
        if ((response[0] === 0x6d) && (response[1] === 0x00)) {
          throw new Error('Wallet already initialized.')
        } else {
          throw new Error('Invalid APDU response.')
        }
      }
    } finally {
      this.transport.close()
    }
  }

  async wipeoutWallet () {
    await this.transport.open(this.deviceInfo)

    try {
      var apdu = Buffer.from('80F0000000', 'hex')

      var response = await this.transport.sendApdu(apdu)

      if (response.length !== 2) {
        throw new Error('Invalid APDU response.')
      }

      if ((response[0] !== 0x90) || (response[1] !== 0x00)) {
        if ((response[0] === 0x6d) && (response[1] === 0x00)) {
          throw new Error('Wallet not initialized.')
        } else {
          throw new Error('Invalid APDU response.')
        }
      }
    } finally {
      this.transport.close()
    }
  }

  async verifyPin (pin) {
    pin = Buffer.from(pin, 'utf8')

    if ((pin.length < 4) || (pin.length > 32)) {
      throw new Error('Invalid pin length.')
    }

    await this.transport.open(this.deviceInfo)

    try {
      var apdu = Buffer.alloc(5 + pin.length)

      apdu[0] = 0x80
      apdu[1] = 0x22
      apdu[2] = 0x00
      apdu[3] = 0x00
      apdu[4] = pin.length

      pin.copy(apdu, 5, 0, pin.length)

      var response = await this.transport.sendApdu(apdu)

      if (response.length !== 2) {
        throw new Error('Invalid APDU response.')
      }

      if ((response[0] !== 0x90) || (response[1] !== 0x00)) {
        if ((response[0] === 0x6d) && (response[1] === 0x00)) {
          throw new Error('Wallet not initialized.')
        } else if ((response[0] === 0x69) && (response[1] === 0x82)) {
          var triesLeft = await this._getPinTriesLeft()
          throw new Error('Invalid PIN-code. ' + triesLeft.toString() + ' tries left.')
        } else if ((response[0] === 0x67) && (response[1] === 0x00)) {
          throw new Error('Unsupported PIN-code length.')
        } else if ((response[0] === 0x69) && (response[1] === 0x83)) {
          throw new Error('PIN-code blocked.')
        } else {
          throw new Error('Invalid APDU response.')
        }
      }
    } finally {
      this.transport.close()
    }
  }

  async _getPinTriesLeft () {
    var apdu = Buffer.from('80228000', 'hex')

    var response = await this.transport.sendApdu(apdu)

    if (response.length !== 2) {
      throw new Error('Invalid APDU response.')
    }

    if (response[0] !== 0x63) {
      if ((response[0] === 0x6d) && (response[1] === 0x00)) {
        throw new Error('Wallet not initialized.')
      } else {
        throw new Error('Invalid APDU response.')
      }
    }

    return response[1] - 0xC0
  }

  async getPinTriesLeft () {
    await this.transport.open(this.deviceInfo)

    try {
      var retVal = await this._getPinTriesLeft()
    } finally {
      this.transport.close()
    }

    return retVal
  }

  async getPublicKey (derivationIndexes) {
    if (derivationIndexes.length > 10) {
      throw new Error('Unsupported number of derivation indexes.')
    }

    await this.transport.open(this.deviceInfo)

    try {
      var apdu = Buffer.alloc(5 + 1 + derivationIndexes.length * 4)

      apdu[0] = 0x80
      apdu[1] = 0x40
      apdu[2] = 0x00
      apdu[3] = 0x00
      apdu[4] = derivationIndexes.length * 4 + 1
      apdu[5] = derivationIndexes.length

      derivationIndexes.forEach(function (element, index) {
        apdu.writeUInt32BE(element, 6 + 4 * index)
      })

      var response = await this.transport.sendApdu(apdu)
      if ((response[response.length - 2] !== 0x90) || (response[response.length - 1] !== 0x00)) {
        if ((response[response.length - 2] === 0x6d) && (response[response.length - 1] === 0x00)) {
          throw new Error('Wallet not initialized.')
        } else if ((response[response.length - 2] === 0x69) && (response[response.length - 1] === 0x82)) {
          throw new Error('PIN-code not verified.')
        } else {
          throw new Error('Invalid APDU response.')
        }
      }

      if (response.length !== 99) {
        throw new Error('Invalid APDU response.')
      }

      var publicKey = {
        publicKey: response.slice(0, 65).toString('hex'),
        chainCode: response.slice(65, 65 + 32).toString('hex')
      }
    } finally {
      this.transport.close()
    }

    return publicKey
  }

  async signData (dataToSign, derivationIndexes, type) {
    if ((type !== 'transaction') && (type !== 'message')) {
      throw new Error('Invalid type.')
    }

    await this.transport.open(this.deviceInfo)

    try {
      var offset = 0
      dataToSign = Buffer.from(dataToSign, 'hex')

      while (offset !== dataToSign.length) {
        var maxChunkSize = 128
        var chunkSize = (offset + maxChunkSize > dataToSign.length ? dataToSign.length - offset : maxChunkSize)
        var apdu = Buffer.alloc(5 + chunkSize)
        apdu[0] = 0x80
        apdu[1] = 0xF2
        apdu[2] = (offset === 0 ? 0x00 : 0x01)
        if ((offset === 0) && (type === 'message')) {
          apdu[3] = 0x01
        } else {
          apdu[3] = 0x00
        }
        apdu[4] = chunkSize

        dataToSign.copy(apdu, 5, offset, offset + chunkSize)

        var response = await this.transport.sendApdu(apdu)

        if (response.length !== 2) {
          throw new Error('Invalid APDU response.')
        }

        if ((response[0] !== 0x90) || (response[1] !== 0x00)) {
          if ((response[0] === 0x6d) && (response[1] === 0x00)) {
            throw new Error('Wallet not initialized.')
          } else if ((response[0] === 0x69) && (response[1] === 0x82)) {
            throw new Error('PIN-code not verified.')
          } else {
            throw new Error('Invalid APDU response.')
          }
        }

        offset += chunkSize
      }

      apdu = Buffer.alloc(5 + 1 + derivationIndexes.length * 4)

      apdu[0] = 0x80
      apdu[1] = 0xf2
      apdu[2] = 0x02
      apdu[3] = 0x00
      apdu[4] = derivationIndexes.length * 4 + 1
      apdu[5] = derivationIndexes.length

      derivationIndexes.forEach(function (element, index) {
        apdu.writeUInt32BE(element, 6 + 4 * index)
      })

      response = await this.transport.sendApdu(apdu)

      if ((response[response.length - 2] !== 0x90) || (response[response.length - 1] !== 0x00)) {
        if ((response[response.length - 2] === 0x69) || (response[response.length - 1] === 0x85)) {
          throw new Error('Transaction signing confirmation time expired.')
        } else {
          throw new Error('Invalid APDU response.')
        }
      }

      response = response.slice(0, (response.length - 2))

      var retVal = response.toString('hex')
    } finally {
      this.transport.close()
    }

    return retVal
  }
}

export default SecalotEthApi
