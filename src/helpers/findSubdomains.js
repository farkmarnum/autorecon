/*
 * Some code was taken from Zachary Balder's Sc0pe.
 * See https://github.com/zbo14/sc0pe
 */

import fs from 'fs'
import util from 'util'
import cluster from 'cluster'
import { spawn } from 'child_process'
import { once } from 'events'
import md5 from 'md5'
import {
  SCAN_FOR_SUBDOMAINS,
  SUBDOMAIN_RESULT,
  REQUEST_WORK,
} from '../constants/messages'
import { chunk, shuffleArray } from './util'
import { DNS_RESOLVERS } from '../constants/resources'

const TMP_DIR = `${__dirname}/../tmp`
const DNS_RESOLVERS_FNAME = `${TMP_DIR}/DNS_RESOLVERS.txt`

const FINDOMAIN_THREADS = 1000

const writeFile = util.promisify(fs.writeFile)

export const findomain = async (domains) => {
  const hash = md5(domains.join(' ') + cluster.worker.id)
  const fname = `${TMP_DIR}/${hash}`
  await writeFile(fname, domains.join('\n'))

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

  const subdomains = []

  const promise = new Promise((resolve) => {
    proc.stdout.setEncoding('utf8').on('data', (resp) => {
      const additionalSubdomains = resp.split('\n').map((s) => s.trim())
      subdomains.push(additionalSubdomains)
    })

    once(proc, 'exit').then(() => {
      resolve(subdomains.flat().filter((a) => a.length > 0))
    })
  })

  return promise
}

export const findSubdomains = (domains) =>
  new Promise((resolve) => {
    console.info('Scanning for subdomains...')

    try {
      fs.mkdirSync(TMP_DIR, { recursive: true })
      fs.writeFileSync(DNS_RESOLVERS_FNAME, DNS_RESOLVERS.join('\n'))
    } catch (err) {
      console.error(err)
      if (err.code !== 'EEXIST') throw err
    }

    const subdomains = new Set()

    const workers = Object.values(cluster.workers)
    let workersFinished = 0

    const chunkedDomains = chunk(domains, {
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
