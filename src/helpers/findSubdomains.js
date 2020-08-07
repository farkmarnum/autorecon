/*
 * Some code was taken from Zachary Balder's Sc0pe.
 * See https://github.com/zbo14/sc0pe
 */

import cluster from 'cluster'
import { once } from 'events'
import { spawn } from 'child_process'
import {
  SCAN_FOR_SUBDOMAINS,
  SUBDOMAIN_RESULT,
  REQUEST_WORK,
} from '../constants/messages'

const TIMEOUT = 5 // minute
const TIMEOUT_MS = TIMEOUT * 60 * 1000

export const amass = async (domain) => {
  const proc = spawn('amass', [
    'enum',
    '-d', domain, /* eslint-disable-line */
    '-nolocaldb',
    '-timeout', TIMEOUT, /* eslint-disable-line */
  ])

  const promise = new Promise((resolve) => {
    proc.stdout.setEncoding('utf8').on('data', (resp) => {
      const subdomains = resp.split('\n').map((s) => s.trim())
      resolve(subdomains)
    })

    // Manually kill the process after TIMEOUT_MS, since sometimes amass doesn't actually stop after TIMEOUT
    setTimeout(() => {
      console.warn(
        `TIMEOUT - killing \`amass enum\` of ${domain} after ${TIMEOUT_MS}ms`,
      )
      proc.kill()
      resolve([])
    }, TIMEOUT_MS)

    return once(proc, 'exit')
  })

  return promise
}

export const findSubdomains = (domains) =>
  new Promise((resolve) => {
    const subdomains = new Set()
    process.stdout.write('Scanning for subdomains...')

    const workers = Object.values(cluster.workers)
    let workersFinished = 0

    const sendWork = (worker) => {
      if (domains.length) {
        const target = domains.pop()
        worker.send({ type: SCAN_FOR_SUBDOMAINS, target })
      } else {
        workersFinished += 1

        if (workersFinished >= workers.length) {
          const result = Array.from(subdomains).filter((s) => s.length > 0)
          console.info(`Found ${result.length} subdomains.`)

          resolve(result)
        }
      }
    }

    workers.forEach((worker) => {
      worker.on('message', ({ type, data }) => {
        if (type === SUBDOMAIN_RESULT) {
          process.stdout.write('.')
          data.forEach((subdomain) => subdomains.add(subdomain))
          sendWork(worker)
        } else if (type === REQUEST_WORK) {
          sendWork(worker)
        }
      })
    })

    workers.forEach(sendWork)
  })
