import fetch from 'node-fetch'
import { exclude } from './constants/domains'
import { domainListUrl } from './constants/resources'

const reWild = /^.*(\*\.|\(\*\)\.)/gi

export const getDomains = async () => {
  const resp = await fetch(domainListUrl)
  const wildcardsText = await resp.text()

  const wildcards = wildcardsText.split(/[\n\r]+/)

  let domains = wildcards.filter((str) => str.match(reWild))
  domains = domains.map((str) => str.replace(reWild, ''))
  domains = domains.filter((domain) => !exclude.includes(domain))
  domains = Array.from(new Set(domains))
  domains = domains.sort()

  return domains.slice(20, 24)
}
