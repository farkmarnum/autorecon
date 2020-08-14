/*
 * Some code was taken from Zachary Balder's Sc0pe.
 * See https://github.com/zbo14/sc0pe
 */

import fs from 'fs'
import cluster from 'cluster'
import { spawn } from 'child_process'
import md5 from 'md5'
import {
  SCAN_FOR_SUBDOMAINS,
  SUBDOMAIN_RESULT,
  REQUEST_WORK,
} from '../constants/messages'
import { chunk, shuffleArray } from './util'
import DNS_RESOLVERS from '../constants/resources'

const DNS_RESOLVERS_FNAME = `${__dirname}/tmp/DNS_RESOLVERS.txt`

const FINDOMAIN_THREADS = 1000

export const findomain = async (domains) => {
  const hash = md5(domains.join(' '))
  const fname = `${__dirname}/tmp/${hash}`
  await fs.writeFile(fname, domains.join('\n'))

  const proc = spawn('findomain', [
    '--quiet',
    '--resolved',
    '--resolvers',
    DNS_RESOLVERS_FNAME,
    '--threads',
    FINDOMAIN_THREADS,
    '--file',
    fname,
  ])

  const promise = new Promise((resolve) => {
    proc.stdout.setEncoding('utf8').on('data', (resp) => {
      const subdomains = resp.split('\n').map((s) => s.trim())
      resolve(subdomains)
    })
  })

  return promise
}

export const findSubdomains = (domains) =>
  new Promise((resolve) => {
    console.info('Scanning for subdomains...')

    try {
      fs.mkdirSync(`${__dirname}/tmp`, { recursive: true })
      fs.writeFileSync(DNS_RESOLVERS_FNAME, DNS_RESOLVERS.join('\n'))
    } catch (err) {
      if (err.code !== 'EEXIST') throw err
    }

    const subdomains = new Set()

    const workers = Object.values(cluster.workers)
    let workersFinished = 0

    const randomlySortedDomains = shuffleArray(domains)
    const chunkedDomains = chunk(randomlySortedDomains, {
      chunks: workers.length,
    })

    const sendWork = (worker) => {
      if (chunkedDomains.length) {
        const target = chunkedDomains.pop()

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
