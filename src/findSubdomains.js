/*
 * Some code was taken from Zachary Balder's Sc0pe.
 * See https://github.com/zbo14/sc0pe
 */

import cluster from 'cluster'
import { once } from 'events'
import { spawn } from 'child_process'
import {
  SCAN_FOR_SUBDOMAINS,
  SCAN_FOR_PORTS,
  SUBDOMAIN_RESULT,
  PORT_RESULT,
  REQUEST_WORK,
} from './constants/messages'

const TIMEOUT = 1 // minute
const TIMEOUT_MS = TIMEOUT * 60 * 1000

export const amass = async (domain) => {
  console.info(`[+] Discovering subdomains for ${domain}`)

  const proc = spawn('amass', [
    'enum',
    '-d', domain, /* eslint-disable-line */
    '-nolocaldb',
    '-passive',
    '-timeout', TIMEOUT, /* eslint-disable-line */
  ])

  const promise = new Promise((resolve) => {
    proc.stdout.setEncoding('utf8').on('data', (resp) => {
      const subdomains = resp.split('\n').map((s) => s.trim())
      resolve(subdomains)
    })

    // Manually kill the process after TIMEOUT_MS, since sometimes amass doesn't actually stop after TIMEOUT
    setTimeout(() => {
      proc.kill()
      resolve()
    }, TIMEOUT_MS)

    return once(proc, 'exit')
  })

  return promise
}

export const findSubdomains = (domains) =>
  new Promise((resolve) => {
    const subdomains = new Set()
    console.info(`findSubdomains called, domains.length = ${domains.length}`)

    const workers = Object.values(cluster.workers)
    let workersFinished = 0

    workers.forEach((worker) => {
      worker.on('message', ({ type, pid, data }) => {
        const sendWork = () => {
          if (domains.length) {
            const domain = domains.pop()
            console.info('sending SCAN_FOR_SUBDOMAINS')
            worker.send({ type: SCAN_FOR_SUBDOMAINS, domain, pid })
          } else {
            workersFinished += 1
            console.info(`Workers complete: ${workersFinished}`)

            if (workersFinished >= workers.length) {
              console.info('ALL DONE')
              resolve(Array.from(subdomains))
            }
          }
        }

        if (type === SUBDOMAIN_RESULT) {
          console.info('SUBDOMAIN_RESULT received')
          console.info('DATA', data)
          data.forEach((subdomain) => subdomains.add(subdomain))
          sendWork()
        } else if (type === REQUEST_WORK) {
          console.info('REQUEST_WORK received')
          sendWork()
        }
      })
    })
  })
