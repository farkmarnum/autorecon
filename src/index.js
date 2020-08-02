import mongoose from 'mongoose'
import { init } from './init'
import { getDomains } from './getDomains'
import { findSubdomains } from './findSubdomains'
import { scanPorts } from './scanPorts'

const storeScan = async (scan) => {
  const Scan = mongoose.model('scan')
  try {
    const entry = new Scan({ scan })
    await entry.save()

    console.info('updated domains!')
  } catch (err) {
    console.error(err)
  }
}

const doJobs = async () => {
  try {
    await init()

    const domainData = await getDomains()
    const domainScan = domainData.reduce(
      (acc, domain) => ({ ...acc, [domain]: new Set() }),
      {},
    )

    const subdomainData = await findSubdomains(domainScan)
    const subdomainScan = Object.entries(subdomainData).reduce(
      (acc, [domain, subdomains]) => ({
        ...acc,
        [domain]: Array.from(subdomains)
          .sort()
          .reduce(
            (accInner, subdomain) => ({
              ...accInner,
              [subdomain]: {},
            }),
            {},
          ),
      }),
      {},
    )

    const portScan = await scanPorts(subdomainScan)

    await storeScan(portScan)

    console.info('complete')
  } catch (err) {
    console.error(err)
  }
}

doJobs()
