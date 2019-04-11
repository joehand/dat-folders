const EventEmitter = require('events')
const path = require('path')
const fsPromises = require('fs').promises

const Dat = require('dat-node')
const Discovery = require('hyperdiscovery')
const toilet = require('toiletdb')
const envPaths = require('env-paths')

module.exports = (...args) => new DatFolders(...args)

class DatFolders extends EventEmitter {
  constructor () {
    super()

    this._paths = envPaths('dat-folders')
    this._datsDb = toilet(path.join(this._paths.config, 'dats.json'))
    this._activeDats = new Map() // <discoveryKey>: <dat>
    this._activeFolders = new Map() // <folder-path>: <discoveryKey>
  }

  async setup () {
    try {
      await fsPromises.mkdir(this._paths.config, { recursive: true })
      const dats = await this._datsDb.read() || {}

      this._swarming = !!dats.length // only start swarm if we have dats already
      this.discovery = Discovery({ autoListen: this._swarming })

      await Promise.all(Object.keys(dats).map(async key => {
        await this.add(dats[key]) // TODO: make sure discovery key still matches?
      }))
    } catch (err) {
      throw err
    }
  }

  async add (folder, opts) {
    folder = path.resolve(folder)
    let dat
    let discoveryKey = this._activeFolders.get(folder)

    // check if already exists
    if (discoveryKey) {
      dat = this._activeDats.get(discoveryKey) // TODO: duplicate folders with same dat may not work here
      if (dat) return dat
    }

    try {
      dat = await Dat(folder, { createIfMissing: false })
      discoveryKey = dat.archive.discoveryKey.toString('hex')

      this._activeDats.set(discoveryKey, dat)
      this._activeFolders.set(folder, discoveryKey)
      await this._datsDb.write(discoveryKey, folder)

      this.discovery.add(dat.archive)

      if (!this._swarming) {
        await this.discovery.listen()
        this._swarming = true
      }

      return dat
    } catch (err) {
      throw err
    }
  }
}
