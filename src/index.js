import cluster from 'cluster'
import mongoose from 'mongoose'
import { init } from './helpers/init'
import { getDomains } from './helpers/getDomains'
import { amass, findSubdomains } from './helpers/findSubdomains'
import { nmap, scanPorts } from './helpers/scanPorts'
import {
  SCAN_FOR_SUBDOMAINS,
  SCAN_FOR_PORTS,
  SUBDOMAIN_RESULT,
  PORT_RESULT,
} from './constants/messages'
import {
  DOMAIN_CACHE,
  SUBDOMAIN_CACHE,
  PORT_CACHE,
  readCache,
  writeCache,
  clearCache,
} from './helpers/cache'

const storeScan = async (entries) => {
  const Scan = mongoose.model('scan')
  try {
    const entry = new Scan({ entries })
    await entry.save()

    console.info('Scan stored')
  } catch (err) {
    console.error(err)
  }
}
const doSupervisor = async () => {
  console.info('Starting supervisor')

  try {
    await init()

    const workers = []
    for (let i = 0; i < process.env.PARALLELISM; i += 1) {
      workers[i] = cluster.fork()
    }

    const domainData = readCache(DOMAIN_CACHE) || (await getDomains())
    writeCache(DOMAIN_CACHE, domainData)

    const subdomainData =
      readCache(SUBDOMAIN_CACHE) || (await findSubdomains(domainData))
    writeCache(SUBDOMAIN_CACHE, subdomainData)

    const portData = readCache(PORT_CACHE) || (await scanPorts(subdomainData))
    writeCache(PORT_CACHE, portData)

    const scan = portData
      .map(
        ({ subdomain, ports }) =>
          `${subdomain.split('.').reverse().join('.')} ${ports
            .sort()
            .join(',')}`,
      )
      .sort()

    await storeScan(scan)

    clearCache()

    console.info('Shutting down workers...')

    Object.values(cluster.workers).forEach((worker) => {
      worker.kill()
    })

    console.info('Complete.')
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

const doWorker = () => {
  process.on('message', async ({ type, target }) => {
    let data

    switch (type) {
      case SCAN_FOR_SUBDOMAINS:
        data = await amass(target)
        process.send({ type: SUBDOMAIN_RESULT, data })
        break
      case SCAN_FOR_PORTS:
        data = await nmap(target)
        process.send({ type: PORT_RESULT, data })
        break
      default:
        console.error(
          `Unknown message type! Message with type ${type} with target ${target} can not be processed.`,
        )
        break
    }
  })
}

if (cluster.isMaster) {
  doSupervisor()
} else {
  doWorker()
}
