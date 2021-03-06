import fetch from 'node-fetch'
import { exclude } from '../constants/domains'
import { domainListUrl } from '../constants/resources'

const reWild = /^.*(\*\.|\(\*\)\.)/gi

export const getDomains = async () => {
  const resp = await fetch(domainListUrl)
  const wildcardsText = await resp.text()

  const wildcards = wildcardsText.split(/[\n\r]+/)

  let domains = wildcards.filter((str) => str.match(reWild)) // must have leading wildcard
  domains = domains.map((str) => str.replace(reWild, '')) // remove leading wildcard
  domains = domains.filter((str) => !str.includes('*')) // no other wildcards
  domains = domains.filter((str) => str.includes('.')) // must be valid domain
  domains = domains.filter((domain) => !exclude.includes(domain)) // remove domains from exlude list
  domains = Array.from(new Set(domains))
  domains = domains.sort()

  console.info(`Fetched ${domains.length} domains.`)

  return domains
}
