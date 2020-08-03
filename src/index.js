import cluster from 'cluster'
import mongoose from 'mongoose'
import { init } from './init'
import { getDomains } from './getDomains'
import { amass, findSubdomains } from './findSubdomains'
import { scanPorts } from './scanPorts'
import {
  SCAN_FOR_SUBDOMAINS,
  SCAN_FOR_PORTS,
  SUBDOMAIN_RESULT,
  // PORT_RESULT,
  REQUEST_WORK,
} from './constants/messages'

const cpus = require('os').cpus().length

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
    for (let i = 0; i < cpus; i += 1) {
      workers[i] = cluster.fork()
    }

    const domainData = await getDomains()

    console.info('Domains fetched')

    const subdomainData = await findSubdomains(domainData)

    const portData = await scanPorts(subdomainData)

    const scan = portData
      .filter((s) => s.length > 0)
      .map((s) => s.split('.').reverse().join('.'))
      .sort()

    await storeScan(scan)

    Object.values(cluster.workers).forEach((worker) => {
      worker.kill()
    })

    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

const doWorker = () => {
  console.info('Worker started')
  process.send({ type: REQUEST_WORK, pid: process.pid })
  console.info('REQUEST_WORK sent')

  process.on('message', async ({ type, pid, domain }) => {
    if (type === SCAN_FOR_SUBDOMAINS && pid === process.pid) {
      console.info('SCAN_FOR_SUBDOMAINS received')
      const data = await amass(domain)
      process.send({ type: SUBDOMAIN_RESULT, pid: process.pid, data })
      console.info('SCAN_FOR_SUBDOMAINS complete')
    } else if (type === SCAN_FOR_PORTS && pid === process.pid) {
      console.info('SCAN_FOR_PORTS received')
      //
      console.info('SCAN_FOR_PORTS complete')
    }
  })
}

if (cluster.isMaster) {
  doSupervisor()
} else {
  doWorker()
}
