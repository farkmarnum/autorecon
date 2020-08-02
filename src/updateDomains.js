import mongoose from 'mongoose'
import fetch from 'node-fetch'

const url =
  'https://raw.githubusercontent.com/arkadiyt/bounty-targets-data/master/data/wildcards.txt'

const reWild = /^.*(\*\.|\(\*\)\.)/gi

const getDomains = async () => {
  const resp = await fetch(url)
  const wildcardsText = await resp.text()

  const wildcards = wildcardsText.split(/[\n\r]+/)

  let domains = wildcards.filter((str) => str.match(reWild))
  domains = domains.map((str) => str.replace(reWild, ''))
  domains = Array.from(new Set(domains))
  domains = domains.sort()

  return domains
}

export const updateDomains = async () => {
  const DomainList = mongoose.model('domain_list')

  const domainList = await getDomains()
  try {
    const entry = new DomainList({ domains: domainList })
    await entry.save()

    console.info('updated domains!')
  } catch (err) {
    console.error(err)
  }
}
