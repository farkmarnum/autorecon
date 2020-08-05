import cluster from 'cluster'
import { once } from 'events'
import { spawn } from 'child_process'
import {
  SCAN_FOR_PORTS,
  PORT_RESULT,
  REQUEST_WORK,
} from '../constants/messages'

const TIMEOUT = 1 // minute
const TIMEOUT_MS = TIMEOUT * 60 * 1000

export const nmap = async (subdomain) => {
  const proc = spawn('nmap', [subdomain])

  const promise = new Promise((resolve) => {
    let resp = ''
    proc.stdout.setEncoding('utf8').on('data', (data) => {
      resp += data
    })

    setTimeout(() => {
      proc.kill()
      resolve([])
    }, TIMEOUT_MS)

    once(proc, 'exit').then(() => {
      try {
        const portInfo = resp.split(/PORT\W+STATE\W+SERVICE/).slice(-1)[0]
        let openPorts = []

        if (portInfo) {
          const portInfoList = portInfo.split('\n')
          const openPortsInfo = portInfoList.filter((s) => s.match(/\bopen\b/))
          openPorts = openPortsInfo.map((s) => s.replace(/^(\d+).*$/, '$1'))
          openPorts = openPorts.map((s) => parseInt(s, 10))
        }

        resolve({ subdomain, ports: openPorts })
      } catch (err) {
        console.error(err)
        resolve({ subdomain, ports: [] })
      }
    })
  })

  return promise
}

export const scanPorts = (subdomains) =>
  new Promise((resolve) => {
    const subdomainsWithPorts = []
    console.info('Scanning for ports...')

    const workers = Object.values(cluster.workers)
    let workersFinished = 0

    const sendWork = (worker) => {
      if (subdomains.length) {
        const target = subdomains.pop()
        worker.send({ type: SCAN_FOR_PORTS, target })
      } else {
        workersFinished += 1

        if (workersFinished >= workers.length) {
          console.info('Scanning ports complete.')
          resolve(subdomainsWithPorts)
        }
      }
    }

    workers.forEach((worker) => {
      worker.on('message', ({ type, data }) => {
        if (type === PORT_RESULT) {
          process.stdout.write(',')
          subdomainsWithPorts.push(data)
          sendWork(worker)
        } else if (type === REQUEST_WORK) {
          sendWork(worker)
        }
      })
    })

    workers.forEach(sendWork)
  })
