/*
 * Some code taken from Zachary Balder's Sc0pe.
 * See https://github.com/zbo14/sc0pe
 */

import { spawn } from 'child_process'
import { once } from 'events'

const maxParallelism = process.env.MAX_PARALLELISM
const FIVE_MINUTES = 5 * 60 * 1000

const queue = []
let parallelism = 0

const parse = (resp, domain, scan) => {
  resp.split('\n').forEach((subdomainRaw) => {
    const subdomain = subdomainRaw.trim()

    if (
      subdomain.includes(' ') ||
      !subdomain.includes(domain) ||
      scan[domain].has(subdomain)
    )
      return

    scan[domain].add(subdomain)
  })
}

const enumerate = async (domain, scan) => {
  if (parallelism >= maxParallelism) {
    await new Promise((resolve) => queue.push(resolve))
  }

  parallelism += 1

  console.info(`[+] Discovering subdomains for ${domain}`)

  const proc = spawn('amass', ['enum', '-d', domain, '-nolocaldb', '-passive'])

  const promise = new Promise((resolve) => {
    proc.stdout
      .setEncoding('utf8')
      .on('data', (resp) => parse(resp, domain, scan))

    setTimeout(() => {
      proc.kill()
      resolve()
    }, FIVE_MINUTES)

    return once(proc, 'exit')
  })

  await promise

  const next = queue.shift()
  if (next) next()

  parallelism -= 1
}

export const findSubdomains = async (domainScan) => {
  const scan = { ...domainScan }

  const promises = Object.keys(domainScan).map((domain) =>
    enumerate(domain, scan),
  )

  await Promise.all(promises)

  return scan
}
