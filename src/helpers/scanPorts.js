import cluster from 'cluster'
import { once } from 'events'
import { spawn } from 'child_process'
import {
  SCAN_FOR_PORTS,
  PORT_RESULT,
  REQUEST_WORK,
} from '../constants/messages'
import { chunk } from './util'

const PER_HOST_TIMEOUT = process.env.NODE_HOST_TIMEOUT || '5m'

export const nmap = async (subdomains) => {
  const nmapSpeedFromEnv = parseInt(process.env.NMAP_SPEED || '3', 10)
  const nmapSpeed = Math.max(0, Math.min(5, nmapSpeedFromEnv))
  const proc = spawn('nmap', [
    '-F',
    '-sS',
    '-n',
    `-T${nmapSpeed}`,
    '--host-timeout',
    PER_HOST_TIMEOUT,
    '--min-hostgroup',
    Math.ceil(subdomains.length / 10),
    '--stats-every',
    '1m',
    ...subdomains,
  ])

  proc.stdout.setEncoding('utf-8')
  proc.stderr.setEncoding('utf-8')

  const promise = new Promise((resolve, reject) => {
    let resp = ''

    proc.stdout.on('data', (data) => {
      resp += data
      if (data.includes('Stats') || data.includes('Timing')) {
        console.info(data)
      }
    })

    proc.stderr.on('data', (data) => {
      if (!data.includes('Failed to resolve')) {
        console.error(data)
      }
    })

    once(proc, 'exit').then(() => {
      const reports = resp.match(/Nmap scan report for [\s\S]*?\n\n/g)

      const result = (reports || [])
        .map((report) => {
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
            console.error(err)
            return undefined
          }
        })
        .filter((a) => a)

      resolve(result)
    })

    once(proc, 'error').then(reject)
  })

  return promise
}

export const scanPorts = (subdomains) =>
  new Promise((resolve) => {
    const subdomainsWithPorts = []
    console.info('Scanning for ports...')

    const workers = Object.values(cluster.workers)
    let workersFinished = 0

    const chunkedSubdomains = chunk(subdomains, { chunks: workers.length })

    const sendWork = (worker) => {
      if (chunkedSubdomains.length) {
        const target = chunkedSubdomains.pop()
        worker.send({ type: SCAN_FOR_PORTS, target })
      } else {
        workersFinished += 1

        if (workersFinished >= workers.length) {
          console.info('Scanning ports complete.')
          const result = subdomainsWithPorts.flat()
          resolve(result)
        }
      }
    }

    workers.forEach((worker) => {
      worker.on('message', ({ type, data }) => {
        if (type === PORT_RESULT) {
          subdomainsWithPorts.push(data)
          sendWork(worker)
        } else if (type === REQUEST_WORK) {
          sendWork(worker)
        }
      })
    })

    workers.forEach(sendWork)
  })
