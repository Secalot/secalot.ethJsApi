'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _toConsumableArray = _interopDefault(require('@babel/runtime/helpers/toConsumableArray'));
var _regeneratorRuntime = _interopDefault(require('@babel/runtime/regenerator'));
var _asyncToGenerator = _interopDefault(require('@babel/runtime/helpers/asyncToGenerator'));
var _classCallCheck = _interopDefault(require('@babel/runtime/helpers/classCallCheck'));
var _createClass = _interopDefault(require('@babel/runtime/helpers/createClass'));
var hid = _interopDefault(require('node-hid'));
var os = _interopDefault(require('os'));
var crypto = _interopDefault(require('crypto'));

var SecalotTransportNodeHid =
/*#__PURE__*/
function () {
  function SecalotTransportNodeHid() {
    _classCallCheck(this, SecalotTransportNodeHid);

    this.U2FHID_PING = 0x80 | 0x01;
    this.U2FHID_MSG = 0x80 | 0x03;
    this.U2FHID_LOCK = 0x80 | 0x04;
    this.U2FHID_INIT = 0x80 | 0x06;
    this.U2FHID_WINK = 0x80 | 0x08;
    this.U2FHID_SYNC = 0x80 | 0x3C;
    this.U2FHID_ERROR = 0x80 | 0x3F;
    this.U2FHID_VENDOR_FIRST = 0x80 | 0x40;
    this.U2FHID_VENDOR_LAST = 0x80 | 0x7F;
    this.U2FHID_BROADCAST_CID = 0xffffffff;
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
    };
    this._channelID = 0xffffffff;
  }

  _createClass(SecalotTransportNodeHid, [{
    key: "open",
    value: function () {
      var _open = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee(deviceInfo) {
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                this.device = new hid.HID(deviceInfo.path);
                _context.next = 3;
                return this._init();

              case 3:
                _context.next = 5;
                return this._checkResponseStructure();

              case 5:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function open(_x) {
        return _open.apply(this, arguments);
      }

      return open;
    }()
  }, {
    key: "close",
    value: function close() {
      this.device.close();
    }
  }, {
    key: "_sendHidFrame",
    value: function _sendHidFrame(data) {
      var array = _toConsumableArray(data);

      if (os.platform() === 'win32') {
        array.unshift(0);
      }

      this.device.write(array);
    }
  }, {
    key: "_receiveHidFrame",
    value: function () {
      var _receiveHidFrame2 = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee2() {
        var that;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                that = this;
                return _context2.abrupt("return", new Promise(function (resolve, reject) {
                  that.device.read(function (err, res) {
                    if (err || !res) {
                      reject(err);
                    } else {
                      var buffer = Buffer.from(res);
                      resolve(buffer);
                    }
                  });
                }));

              case 2:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function _receiveHidFrame() {
        return _receiveHidFrame2.apply(this, arguments);
      }

      return _receiveHidFrame;
    }()
  }, {
    key: "_init",
    value: function () {
      var _init2 = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee3() {
        var nonce, response, nonce2;
        return _regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                nonce = crypto.pseudoRandomBytes(8);

                this._sendCommand(this.U2FHID_INIT, 0xFFFFFFFF, nonce);

                _context3.next = 4;
                return this._receiveResponse(this.U2FHID_INIT, 0xFFFFFFFF);

              case 4:
                response = _context3.sent;
                nonce2 = response.slice(0, 8);

                if (!(nonce.toString('hex') !== nonce2.toString('hex'))) {
                  _context3.next = 8;
                  break;
                }

                throw new Error('Error initializing U2F HID device: incorrect nonce');

              case 8:
                this._channelID = response.readUInt32BE(8);

              case 9:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function _init() {
        return _init2.apply(this, arguments);
      }

      return _init;
    }()
  }, {
    key: "_sendCommand",
    value: function _sendCommand(command, channelID, data) {
      var buffer = Buffer.alloc(64);
      buffer.fill(0);
      buffer.writeUInt32BE(channelID, 0);
      buffer.writeUInt8(command, 4);
      buffer.writeUInt16BE(data.length, 5);
      data.copy(buffer, 7);
      data = data.slice(buffer.length - 7);

      this._sendHidFrame(buffer);

      var seq = 0;

      while (data.length > 0) {
        buffer.fill(0);
        buffer.writeUInt32BE(channelID, 0);
        buffer.writeUInt8(seq++, 4);
        data.copy(buffer, 5);
        data = data.slice(buffer.length - 5);

        if (seq > 0x80) {
          throw new Error('Protocol error.');
        }

        this._sendHidFrame(buffer);
      }
    }
  }, {
    key: "_receiveNextFrame",
    value: function () {
      var _receiveNextFrame2 = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee4(channelID) {
        var frame, receivedChannelId, cmd, errCode;
        return _regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this._receiveHidFrame();

              case 2:
                frame = _context4.sent;
                receivedChannelId = frame.readUInt32BE(0);
                cmd = frame.readUInt8(4);

              case 5:
                if (receivedChannelId !== channelID) {
                  _context4.next = 0;
                  break;
                }

              case 6:
                if (!(cmd === this.U2FHID_ERROR)) {
                  _context4.next = 9;
                  break;
                }

                errCode = frame.readUInt8(7);
                throw new Error(this.hidErrors[errCode] || this.hidErrors[0x7f]);

              case 9:
                return _context4.abrupt("return", frame);

              case 10:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function _receiveNextFrame(_x2) {
        return _receiveNextFrame2.apply(this, arguments);
      }

      return _receiveNextFrame;
    }()
  }, {
    key: "_receiveResponse",
    value: function () {
      var _receiveResponse2 = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee5(command, channelID) {
        var seq, receivedBufs, receivedBytes, frame, cmd, toReceive;
        return _regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                seq = 0;
                receivedBufs = [];
                receivedBytes = 0;
                _context5.next = 5;
                return this._receiveNextFrame(channelID);

              case 5:
                frame = _context5.sent;
                cmd = frame.readUInt8(4);

                if (!((cmd & 0x80) === 0)) {
                  _context5.next = 9;
                  break;
                }

                throw new Error('Invalid U2F packet received.');

              case 9:
                toReceive = frame.readUInt16BE(5);
                receivedBufs[0] = frame.slice(7);
                receivedBytes += receivedBufs[0].length;

              case 12:
                if (!(receivedBytes < toReceive)) {
                  _context5.next = 26;
                  break;
                }

                _context5.next = 15;
                return this._receiveNextFrame(channelID);

              case 15:
                frame = _context5.sent;
                cmd = frame.readUInt8(4);

                if (!(cmd !== seq)) {
                  _context5.next = 19;
                  break;
                }

                throw new Error('Invalid U2F packet received.');

              case 19:
                seq++;

                if (!(seq > 0x80)) {
                  _context5.next = 22;
                  break;
                }

                throw new Error('Protocol error.');

              case 22:
                receivedBufs[cmd + 1] = frame.slice(5);
                receivedBytes += receivedBufs[cmd + 1].length;
                _context5.next = 12;
                break;

              case 26:
                return _context5.abrupt("return", Buffer.concat(receivedBufs).slice(0, toReceive));

              case 27:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function _receiveResponse(_x3, _x4) {
        return _receiveResponse2.apply(this, arguments);
      }

      return _receiveResponse;
    }()
  }, {
    key: "_wrapApdu",
    value: function _wrapApdu(apdu) {
      if (apdu.length > 255 - 8) {
        throw new Error('APDU length too big.');
      }

      var offset = 0;
      var wrappedApdu = Buffer.alloc(7 + 32 + 32 + 1 + 8 + apdu.length);
      var magic = Buffer.from('1122334455667788', 'hex');
      wrappedApdu[offset++] = 0x00;
      wrappedApdu[offset++] = 0x02;
      wrappedApdu[offset++] = 0x03;
      wrappedApdu[offset++] = 0x00;
      wrappedApdu[offset++] = 0x00;
      wrappedApdu.writeUInt16BE(wrappedApdu.length - 7, offset);
      offset += 2;
      wrappedApdu.fill(0, offset, offset + 64);
      offset += 64;
      wrappedApdu[offset++] = apdu.length + 8;
      magic.copy(wrappedApdu, offset);
      offset += 8;
      apdu.copy(wrappedApdu, offset);
      return wrappedApdu;
    }
  }, {
    key: "_checkResponseStructure",
    value: function () {
      var _checkResponseStructure2 = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee6() {
        var invalidApdu, expectedResponse, wrappedApdu, response;
        return _regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                invalidApdu = Buffer.from('ff000000', 'hex');
                expectedResponse = Buffer.from('01000000006e009000', 'hex');
                wrappedApdu = this._wrapApdu(invalidApdu);

                this._sendCommand(this.U2FHID_MSG, this._channelID, wrappedApdu);

                _context6.next = 6;
                return this._receiveResponse(this.U2FHID_MSG, this._channelID);

              case 6:
                response = _context6.sent;

                if (!(response.length !== 5 + 2 + 2)) {
                  _context6.next = 9;
                  break;
                }

                throw new Error('Please update your Secalot firmware to version 4 or greater.');

              case 9:
                if (!(response.compare(expectedResponse) !== 0)) {
                  _context6.next = 11;
                  break;
                }

                throw new Error('Please update your Secalot firmware to version 4 or greater.');

              case 11:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function _checkResponseStructure() {
        return _checkResponseStructure2.apply(this, arguments);
      }

      return _checkResponseStructure;
    }()
  }, {
    key: "sendApdu",
    value: function () {
      var _sendApdu = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee7(apdu) {
        var wrappedApdu, response;
        return _regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                wrappedApdu = this._wrapApdu(apdu);

                this._sendCommand(this.U2FHID_MSG, this._channelID, wrappedApdu);

                _context7.next = 4;
                return this._receiveResponse(this.U2FHID_MSG, this._channelID);

              case 4:
                response = _context7.sent;

                if (!(response.length < 5 + 2)) {
                  _context7.next = 13;
                  break;
                }

                if (!(response.length < 2)) {
                  _context7.next = 8;
                  break;
                }

                throw new Error('Invalid response APDU.');

              case 8:
                if (!(response.length === 2 && (response[response.length - 2] === 0x69 || response[response.length - 1] === 0x85))) {
                  _context7.next = 12;
                  break;
                }

                return _context7.abrupt("return", this.sendApdu(apdu));

              case 12:
                throw new Error('Invalid response APDU.');

              case 13:
                if (!(response[0] !== 0x01 || response[1] !== 0x00 || response[2] !== 0x00 || response[3] !== 0x00 || response[4] !== 0x00)) {
                  _context7.next = 15;
                  break;
                }

                throw new Error('Invalid response APDU.');

              case 15:
                if (!(response[response.length - 2] !== 0x90 || response[response.length - 1] !== 0x00)) {
                  _context7.next = 17;
                  break;
                }

                throw new Error('Invalid response APDU.');

              case 17:
                response = response.slice(5, response.length - 2);
                return _context7.abrupt("return", response);

              case 19:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function sendApdu(_x5) {
        return _sendApdu.apply(this, arguments);
      }

      return sendApdu;
    }()
  }], [{
    key: "getConnectedDevices",
    value: function getConnectedDevices() {
      var devices = hid.devices().filter(function (deviceInfo) {
        if (os.platform() === 'linux') {
          if (deviceInfo.interface === 0x01 && deviceInfo.vendorId === 0x1209 && deviceInfo.productId === 0x7000) {
            return true;
          }
        } else {
          if (deviceInfo.usagePage === 0xF1D0 && deviceInfo.vendorId === 0x1209 && deviceInfo.productId === 0x7000) {
            return true;
          }
        }

        return false;
      });
      return devices;
    }
  }]);

  return SecalotTransportNodeHid;
}();

var SecalotEthApi =
/*#__PURE__*/
function () {
  function SecalotEthApi(deviceInfo) {
    _classCallCheck(this, SecalotEthApi);

    this.transport = new SecalotTransportNodeHid();
    this.deviceInfo = deviceInfo;
  }

  _createClass(SecalotEthApi, [{
    key: "close",
    value: function close() {
      this.transport.close();
    }
  }, {
    key: "getInfo",
    value: function () {
      var _getInfo = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee() {
        var apdu, response, info;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.transport.open(this.deviceInfo);

              case 2:
                _context.prev = 2;
                apdu = Buffer.from('80C40000', 'hex');
                _context.next = 6;
                return this.transport.sendApdu(apdu);

              case 6:
                response = _context.sent;

                if (!(response[response.length - 2] !== 0x90 || response[response.length - 1] !== 0x00)) {
                  _context.next = 9;
                  break;
                }

                throw new Error('Invalid APDU response.');

              case 9:
                if (!(response.length !== 10)) {
                  _context.next = 11;
                  break;
                }

                throw new Error('Invalid APDU response.');

              case 11:
                info = {
                  version: response[0].toString() + '.' + response[1].toString(),
                  walletInitialized: (response[2] & 0x01) === 0x01,
                  pinVerified: (response[2] & 0x02) === 0x02
                };

              case 12:
                _context.prev = 12;
                this.transport.close();
                return _context.finish(12);

              case 15:
                return _context.abrupt("return", info);

              case 16:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this, [[2,, 12, 15]]);
      }));

      function getInfo() {
        return _getInfo.apply(this, arguments);
      }

      return getInfo;
    }()
  }, {
    key: "getRandom",
    value: function () {
      var _getRandom = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee2(length) {
        var apdu, response;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!(length === 0 || length > 128)) {
                  _context2.next = 2;
                  break;
                }

                throw new Error('Invalid length.');

              case 2:
                _context2.next = 4;
                return this.transport.open(this.deviceInfo);

              case 4:
                _context2.prev = 4;
                apdu = Buffer.from('80C0000000', 'hex');
                apdu[4] = length;
                _context2.next = 9;
                return this.transport.sendApdu(apdu);

              case 9:
                response = _context2.sent;

                if (!(response[response.length - 2] !== 0x90 || response[response.length - 1] !== 0x00)) {
                  _context2.next = 12;
                  break;
                }

                throw new Error('Invalid APDU response.');

              case 12:
                if (!(response.length !== length + 2)) {
                  _context2.next = 14;
                  break;
                }

                throw new Error('Invalid APDU response.');

              case 14:
                response = response.slice(0, response.length - 2);

              case 15:
                _context2.prev = 15;
                this.transport.close();
                return _context2.finish(15);

              case 18:
                return _context2.abrupt("return", response.toString('hex'));

              case 19:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this, [[4,, 15, 18]]);
      }));

      function getRandom(_x) {
        return _getRandom.apply(this, arguments);
      }

      return getRandom;
    }()
  }, {
    key: "initWallet",
    value: function () {
      var _initWallet = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee3(seed, pin) {
        var apdu, response;
        return _regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                seed = Buffer.from(seed, 'hex');
                pin = Buffer.from(pin, 'utf8');

                if (!(seed.length < 32 || seed.length > 64)) {
                  _context3.next = 4;
                  break;
                }

                throw new Error('Invalid seed length.');

              case 4:
                if (!(pin.length < 4 || pin.length > 32)) {
                  _context3.next = 6;
                  break;
                }

                throw new Error('Invalid pin length.');

              case 6:
                _context3.next = 8;
                return this.transport.open(this.deviceInfo);

              case 8:
                _context3.prev = 8;
                apdu = Buffer.alloc(5 + 2 + seed.length + pin.length);
                apdu[0] = 0x80;
                apdu[1] = 0x20;
                apdu[2] = 0x00;
                apdu[3] = 0x00;
                apdu[4] = 2 + pin.length + seed.length;
                apdu[5] = pin.length;
                pin.copy(apdu, 6, 0, pin.length);
                apdu[6 + pin.length] = seed.length;
                seed.copy(apdu, 6 + pin.length + 1, 0, seed.length);
                _context3.next = 21;
                return this.transport.sendApdu(apdu);

              case 21:
                response = _context3.sent;

                if (!(response.length !== 2)) {
                  _context3.next = 24;
                  break;
                }

                throw new Error('Invalid APDU response.');

              case 24:
                if (!(response[0] !== 0x90 || response[1] !== 0x00)) {
                  _context3.next = 30;
                  break;
                }

                if (!(response[0] === 0x6d && response[1] === 0x00)) {
                  _context3.next = 29;
                  break;
                }

                throw new Error('Wallet already initialized.');

              case 29:
                throw new Error('Invalid APDU response.');

              case 30:
                _context3.prev = 30;
                this.transport.close();
                return _context3.finish(30);

              case 33:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this, [[8,, 30, 33]]);
      }));

      function initWallet(_x2, _x3) {
        return _initWallet.apply(this, arguments);
      }

      return initWallet;
    }()
  }, {
    key: "wipeoutWallet",
    value: function () {
      var _wipeoutWallet = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee4() {
        var apdu, response;
        return _regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this.transport.open(this.deviceInfo);

              case 2:
                _context4.prev = 2;
                apdu = Buffer.from('80F0000000', 'hex');
                _context4.next = 6;
                return this.transport.sendApdu(apdu);

              case 6:
                response = _context4.sent;

                if (!(response.length !== 2)) {
                  _context4.next = 9;
                  break;
                }

                throw new Error('Invalid APDU response.');

              case 9:
                if (!(response[0] !== 0x90 || response[1] !== 0x00)) {
                  _context4.next = 15;
                  break;
                }

                if (!(response[0] === 0x6d && response[1] === 0x00)) {
                  _context4.next = 14;
                  break;
                }

                throw new Error('Wallet not initialized.');

              case 14:
                throw new Error('Invalid APDU response.');

              case 15:
                _context4.prev = 15;
                this.transport.close();
                return _context4.finish(15);

              case 18:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this, [[2,, 15, 18]]);
      }));

      function wipeoutWallet() {
        return _wipeoutWallet.apply(this, arguments);
      }

      return wipeoutWallet;
    }()
  }, {
    key: "verifyPin",
    value: function () {
      var _verifyPin = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee5(pin) {
        var apdu, response, triesLeft;
        return _regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                pin = Buffer.from(pin, 'utf8');

                if (!(pin.length < 4 || pin.length > 32)) {
                  _context5.next = 3;
                  break;
                }

                throw new Error('Invalid pin length.');

              case 3:
                _context5.next = 5;
                return this.transport.open(this.deviceInfo);

              case 5:
                _context5.prev = 5;
                apdu = Buffer.alloc(5 + pin.length);
                apdu[0] = 0x80;
                apdu[1] = 0x22;
                apdu[2] = 0x00;
                apdu[3] = 0x00;
                apdu[4] = pin.length;
                pin.copy(apdu, 5, 0, pin.length);
                _context5.next = 15;
                return this.transport.sendApdu(apdu);

              case 15:
                response = _context5.sent;

                if (!(response.length !== 2)) {
                  _context5.next = 18;
                  break;
                }

                throw new Error('Invalid APDU response.');

              case 18:
                if (!(response[0] !== 0x90 || response[1] !== 0x00)) {
                  _context5.next = 39;
                  break;
                }

                if (!(response[0] === 0x6d && response[1] === 0x00)) {
                  _context5.next = 23;
                  break;
                }

                throw new Error('Wallet not initialized.');

              case 23:
                if (!(response[0] === 0x69 && response[1] === 0x82)) {
                  _context5.next = 30;
                  break;
                }

                _context5.next = 26;
                return this._getPinTriesLeft();

              case 26:
                triesLeft = _context5.sent;
                throw new Error('Invalid PIN-code. ' + triesLeft.toString() + ' tries left.');

              case 30:
                if (!(response[0] === 0x67 && response[1] === 0x00)) {
                  _context5.next = 34;
                  break;
                }

                throw new Error('Unsupported PIN-code length.');

              case 34:
                if (!(response[0] === 0x69 && response[1] === 0x83)) {
                  _context5.next = 38;
                  break;
                }

                throw new Error('PIN-code blocked.');

              case 38:
                throw new Error('Invalid APDU response.');

              case 39:
                _context5.prev = 39;
                this.transport.close();
                return _context5.finish(39);

              case 42:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this, [[5,, 39, 42]]);
      }));

      function verifyPin(_x4) {
        return _verifyPin.apply(this, arguments);
      }

      return verifyPin;
    }()
  }, {
    key: "_getPinTriesLeft",
    value: function () {
      var _getPinTriesLeft2 = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee6() {
        var apdu, response;
        return _regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                apdu = Buffer.from('80228000', 'hex');
                _context6.next = 3;
                return this.transport.sendApdu(apdu);

              case 3:
                response = _context6.sent;

                if (!(response.length !== 2)) {
                  _context6.next = 6;
                  break;
                }

                throw new Error('Invalid APDU response.');

              case 6:
                if (!(response[0] !== 0x63)) {
                  _context6.next = 12;
                  break;
                }

                if (!(response[0] === 0x6d && response[1] === 0x00)) {
                  _context6.next = 11;
                  break;
                }

                throw new Error('Wallet not initialized.');

              case 11:
                throw new Error('Invalid APDU response.');

              case 12:
                return _context6.abrupt("return", response[1] - 0xC0);

              case 13:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function _getPinTriesLeft() {
        return _getPinTriesLeft2.apply(this, arguments);
      }

      return _getPinTriesLeft;
    }()
  }, {
    key: "getPinTriesLeft",
    value: function () {
      var _getPinTriesLeft3 = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee7() {
        var retVal;
        return _regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                _context7.next = 2;
                return this.transport.open(this.deviceInfo);

              case 2:
                _context7.prev = 2;
                _context7.next = 5;
                return this._getPinTriesLeft();

              case 5:
                retVal = _context7.sent;

              case 6:
                _context7.prev = 6;
                this.transport.close();
                return _context7.finish(6);

              case 9:
                return _context7.abrupt("return", retVal);

              case 10:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this, [[2,, 6, 9]]);
      }));

      function getPinTriesLeft() {
        return _getPinTriesLeft3.apply(this, arguments);
      }

      return getPinTriesLeft;
    }()
  }, {
    key: "getPublicKey",
    value: function () {
      var _getPublicKey = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee8(derivationIndexes) {
        var apdu, response, publicKey;
        return _regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                if (!(derivationIndexes.length > 10)) {
                  _context8.next = 2;
                  break;
                }

                throw new Error('Unsupported number of derivation indexes.');

              case 2:
                _context8.next = 4;
                return this.transport.open(this.deviceInfo);

              case 4:
                _context8.prev = 4;
                apdu = Buffer.alloc(5 + 1 + derivationIndexes.length * 4);
                apdu[0] = 0x80;
                apdu[1] = 0x40;
                apdu[2] = 0x00;
                apdu[3] = 0x00;
                apdu[4] = derivationIndexes.length * 4 + 1;
                apdu[5] = derivationIndexes.length;
                derivationIndexes.forEach(function (element, index) {
                  apdu.writeUInt32BE(element, 6 + 4 * index);
                });
                _context8.next = 15;
                return this.transport.sendApdu(apdu);

              case 15:
                response = _context8.sent;

                if (!(response[response.length - 2] !== 0x90 || response[response.length - 1] !== 0x00)) {
                  _context8.next = 26;
                  break;
                }

                if (!(response[response.length - 2] === 0x6d && response[response.length - 1] === 0x00)) {
                  _context8.next = 21;
                  break;
                }

                throw new Error('Wallet not initialized.');

              case 21:
                if (!(response[response.length - 2] === 0x69 && response[response.length - 1] === 0x82)) {
                  _context8.next = 25;
                  break;
                }

                throw new Error('PIN-code not verified.');

              case 25:
                throw new Error('Invalid APDU response.');

              case 26:
                if (!(response.length !== 99)) {
                  _context8.next = 28;
                  break;
                }

                throw new Error('Invalid APDU response.');

              case 28:
                publicKey = {
                  publicKey: response.slice(0, 65).toString('hex'),
                  chainCode: response.slice(65, 65 + 32).toString('hex')
                };

              case 29:
                _context8.prev = 29;
                this.transport.close();
                return _context8.finish(29);

              case 32:
                return _context8.abrupt("return", publicKey);

              case 33:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this, [[4,, 29, 32]]);
      }));

      function getPublicKey(_x5) {
        return _getPublicKey.apply(this, arguments);
      }

      return getPublicKey;
    }()
  }, {
    key: "signData",
    value: function () {
      var _signData = _asyncToGenerator(
      /*#__PURE__*/
      _regeneratorRuntime.mark(function _callee9(dataToSign, derivationIndexes, type) {
        var offset, maxChunkSize, chunkSize, apdu, response, retVal;
        return _regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                if (!(type !== 'transaction' && type !== 'message')) {
                  _context9.next = 2;
                  break;
                }

                throw new Error('Invalid type.');

              case 2:
                _context9.next = 4;
                return this.transport.open(this.deviceInfo);

              case 4:
                _context9.prev = 4;
                offset = 0;
                dataToSign = Buffer.from(dataToSign, 'hex');

              case 7:
                if (!(offset !== dataToSign.length)) {
                  _context9.next = 35;
                  break;
                }

                maxChunkSize = 128;
                chunkSize = offset + maxChunkSize > dataToSign.length ? dataToSign.length - offset : maxChunkSize;
                apdu = Buffer.alloc(5 + chunkSize);
                apdu[0] = 0x80;
                apdu[1] = 0xF2;
                apdu[2] = offset === 0 ? 0x00 : 0x01;

                if (offset === 0 && type === 'message') {
                  apdu[3] = 0x01;
                } else {
                  apdu[3] = 0x00;
                }

                apdu[4] = chunkSize;
                dataToSign.copy(apdu, 5, offset, offset + chunkSize);
                _context9.next = 19;
                return this.transport.sendApdu(apdu);

              case 19:
                response = _context9.sent;

                if (!(response.length !== 2)) {
                  _context9.next = 22;
                  break;
                }

                throw new Error('Invalid APDU response.');

              case 22:
                if (!(response[0] !== 0x90 || response[1] !== 0x00)) {
                  _context9.next = 32;
                  break;
                }

                if (!(response[0] === 0x6d && response[1] === 0x00)) {
                  _context9.next = 27;
                  break;
                }

                throw new Error('Wallet not initialized.');

              case 27:
                if (!(response[0] === 0x69 && response[1] === 0x82)) {
                  _context9.next = 31;
                  break;
                }

                throw new Error('PIN-code not verified.');

              case 31:
                throw new Error('Invalid APDU response.');

              case 32:
                offset += chunkSize;
                _context9.next = 7;
                break;

              case 35:
                apdu = Buffer.alloc(5 + 1 + derivationIndexes.length * 4);
                apdu[0] = 0x80;
                apdu[1] = 0xf2;
                apdu[2] = 0x02;
                apdu[3] = 0x00;
                apdu[4] = derivationIndexes.length * 4 + 1;
                apdu[5] = derivationIndexes.length;
                derivationIndexes.forEach(function (element, index) {
                  apdu.writeUInt32BE(element, 6 + 4 * index);
                });
                _context9.next = 45;
                return this.transport.sendApdu(apdu);

              case 45:
                response = _context9.sent;

                if (!(response[response.length - 2] !== 0x90 || response[response.length - 1] !== 0x00)) {
                  _context9.next = 52;
                  break;
                }

                if (!(response[response.length - 2] === 0x69 || response[response.length - 1] === 0x85)) {
                  _context9.next = 51;
                  break;
                }

                throw new Error('Transaction signing confirmation time expired.');

              case 51:
                throw new Error('Invalid APDU response.');

              case 52:
                response = response.slice(0, response.length - 2);
                retVal = response.toString('hex');

              case 54:
                _context9.prev = 54;
                this.transport.close();
                return _context9.finish(54);

              case 57:
                return _context9.abrupt("return", retVal);

              case 58:
              case "end":
                return _context9.stop();
            }
          }
        }, _callee9, this, [[4,, 54, 57]]);
      }));

      function signData(_x6, _x7, _x8) {
        return _signData.apply(this, arguments);
      }

      return signData;
    }()
  }], [{
    key: "getConnectedDevices",
    value: function getConnectedDevices() {
      return SecalotTransportNodeHid.getConnectedDevices();
    }
  }]);

  return SecalotEthApi;
}();

module.exports = SecalotEthApi;
