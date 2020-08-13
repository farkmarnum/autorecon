import cluster from 'cluster'
import { once } from 'events'
import { spawn } from 'child_process'
import {
  SCAN_FOR_PORTS,
  PORT_RESULT,
  REQUEST_WORK,
} from '../constants/messages'
import { chunk, shuffleArray } from './util'

const PER_HOST_TIMEOUT = process.env.NODE_HOST_TIMEOUT || '5m'

export const nmap = async (hosts) => {
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
    Math.ceil(hosts.length / 10),
    '--stats-every',
    '1m',
    ...hosts,
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

            const { host } = infoText.match(
              /Nmap scan report for (?<host>[^ ]*?) /,
            ).groups

            const openPorts = (portText || '')
              .split('\n')
              .filter((s) => s.match(/\bopen\b/))
              .map((s) => s.replace(/^(\d+).*$/, '$1'))
              .map((s) => parseInt(s, 10))

            return { host, openPorts }
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

export const scanPorts = (hosts) =>
  new Promise((resolve) => {
    const hostsWithPorts = []
    console.info('Scanning for ports...')

    const workers = Object.values(cluster.workers)
    let workersFinished = 0

    const randomlySortedHosts = shuffleArray(hosts)
    const chunkedHosts = chunk(randomlySortedHosts, {
      chunks: workers.length,
    })

    const sendWork = (worker) => {
      if (chunkedHosts.length) {
        const target = chunkedHosts.pop()
        worker.send({ type: SCAN_FOR_PORTS, target })
      } else {
        workersFinished += 1

        if (workersFinished >= workers.length) {
          console.info('Scanning ports complete.')
          const result = hostsWithPorts.flat()
          resolve(result)
        }
      }
    }

    workers.forEach((worker) => {
      worker.on('message', ({ type, data }) => {
        if (type === PORT_RESULT) {
          hostsWithPorts.push(data)
          sendWork(worker)
        } else if (type === REQUEST_WORK) {
          sendWork(worker)
        }
      })
    })

    workers.forEach(sendWork)
  })
