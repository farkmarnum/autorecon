/*
 * Some code was taken from Zachary Balder's Sc0pe.
 * See https://github.com/zbo14/sc0pe
 */

import cluster from 'cluster'
import { spawn } from 'child_process'
import {
  SCAN_FOR_SUBDOMAINS,
  SUBDOMAIN_RESULT,
  REQUEST_WORK,
} from '../constants/messages'

const PER_PROC_TIMEOUT = process.env.FINDOMAIN_HOST_TIMEOUT || 5 // minutes
const PER_PROC_TIMEOUT_MS = PER_PROC_TIMEOUT * 60 * 1000

export const findomain = async (domain) => {
  const proc = spawn('findomain', ['-q', '-r', '-t', domain])

  const promise = new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn(`timeout: ${domain}`)
      proc.kill()
      resolve([])
    }, PER_PROC_TIMEOUT_MS)

    proc.stdout.setEncoding('utf8').on('data', (resp) => {
      clearTimeout(timeout)
      const subdomains = resp.split('\n').map((s) => s.trim())
      resolve(subdomains)
    })
  })

  return promise
}

export const findSubdomains = (domains) =>
  new Promise((resolve) => {
    console.info('Scanning for subdomains...')

    const subdomains = new Set()

    const workers = Object.values(cluster.workers)
    let workersFinished = 0

    const currentDomains = Array(workers.length).fill(null)

    const sendWork = (worker) => {
      if (domains.length) {
        const target = domains.pop()
        currentDomains[worker.id - 1] = target

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
          data.forEach((subdomain) => subdomains.add(subdomain))
          sendWork(worker)
        } else if (type === REQUEST_WORK) {
          sendWork(worker)
        }
      })
    })

    workers.forEach(sendWork)
  })
