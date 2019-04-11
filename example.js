const path = require('path')
const DatFolders = require('.');

(async () => {
  const dats = DatFolders()
  await dats.setup()

  try {
    const dat = await dats.add(path.join(__dirname, 'test-dat'))
    console.log(dat.key.toString('hex'))
    dats.discovery.on('connection', () => {
      console.log('new connection')
    })
  } catch (e) {
    throw e
  }
})()
