import cluster from 'cluster'
import { once } from 'events'
import { spawn } from 'child_process'
import {
  SCAN_FOR_PORTS,
  PORT_RESULT,
  REQUEST_WORK,
} from '../constants/messages'
import { chunk } from './util'

export const nmap = async (subdomains) => {
  const proc = spawn('nmap', ['-sS', '-n', '-T4', ...subdomains])

  const promise = new Promise((resolve) => {
    let resp = ''
    proc.stdout.setEncoding('utf8').on('data', (data) => {
      resp += data
    })

    once(proc, 'exit').then(() => {
      const reports = resp.match(/Nmap scan report for [\s\S]*?\n\n/g)

      const result = (reports || []).map((report) => {
        try {
          const [infoText, portText] = report.split(/PORT\W+STATE\W+SERVICE/)

          const { subdomain } = infoText.match(
            /Nmap scan report for (?<subdomain>[^ ]*?) /,
          ).groups

          const openPorts = (portText || '')
            .split('\n')
            .filter((s) => s.match(/\bopen\b/))
            .map((s) => s.replace(/^(\d+).*$/, '$1'))
            .map((s) => parseInt(s, 10))

          return { subdomain, openPorts }
        } catch (err) {
          console.error('ERROR ON HEEEEERRRREEEE', err)
          return []
        }
      })

      resolve(result)
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

    const chunkedSubdomains = chunk(subdomains, workers.length)

    const sendWork = (worker) => {
      if (chunkedSubdomains.length) {
        const target = chunkedSubdomains.pop()
        worker.send({ type: SCAN_FOR_PORTS, target })
      } else {
        workersFinished += 1

        if (workersFinished >= workers.length) {
          console.info('Scanning ports complete.')
          resolve(subdomainsWithPorts.flat())
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
