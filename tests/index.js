import SecalotEthApi from '../src/index'

(async () => {
  try {
    var devices = SecalotEthApi.getConnectedDevices()

    if (devices.length === 0) {
      throw Error('Please connect a device')
    }

    var secalot = new SecalotEthApi(devices[0])

    var info = await secalot.getInfo()
    console.log(info)

    var random = await secalot.getRandom(64)
    console.log('Random: ' + random.toString('hex'))

    var seed = 'e5f7e63a0510726c52cbb583a685eceb539c78d7ae8e2ce0ca7bb868fd9af15ab24cf804e3ca2aa2845c2a60bf5d01057f4539532f2de7e3e8e5f6e6476979d7'

    if (info.walletInitialized === true) {
      await secalot.wipeoutWallet()
    }

    await secalot.initWallet(seed, '123456')

    await secalot.verifyPin('123456')

    var derivationIndexes = [0x8000002C, 0x8000003C, 0x80000000, 0x00000000, 0x00000000]
    var publicKey = await secalot.getPublicKey(derivationIndexes)
    console.log('Public key: ' + publicKey.publicKey)
    console.log('Chain code: ' + publicKey.chainCode)

    var dataToSign = 'e5f7e63a0510726c52cbb583a685eceb539c78d7ae8e2ce0ca7bb868fd9af15ab24cf804e3ca2aa2845c2a60bf5d01 7f4539532f2de7e3e8e5f6e6476979d7'

    var signature = await secalot.signData(dataToSign, derivationIndexes, 'transaction')
    console.log('Transaction signature: ' + signature.toString('hex'))
    signature = await secalot.signData(dataToSign, derivationIndexes, 'message')
    console.log('Message signature: ' + signature.toString('hex'))
  } catch (e) {
    console.log(e)
  }
})()
