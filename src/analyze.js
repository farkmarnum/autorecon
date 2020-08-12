import mongoose from 'mongoose'
import { init } from './helpers/init'

const getScans = async () => {
  const Scan = mongoose.model('scan')

  const lastTwoScans = await Scan.find().sort({ created_at: -1 }).limit(2)

  return lastTwoScans
}

const parseRecord = (record) => {
  const infos = record.split('\n')

  return infos.reduce((acc, info) => {
    const [subdomain, openPortsStr] = info.split()
    const openPorts = openPortsStr.split(',')
    return { ...acc, [subdomain]: openPorts }
  }, {})
}

const subtract = (a, b) => [...a].filter((x) => !b.has(x))

const analyze = async () => {
  const [currScanRecord, prevScanRecord] = await getScans()

  const curr = parseRecord(currScanRecord)
  const prev = parseRecord(prevScanRecord)

  const addedPorts = {}
  const removedPorts = {}

  const prevSubdomains = new Set(Object.keys(prev))
  const currSubdomains = new Set(Object.keys(curr))

  const addedSubdomains = Array.from(currSubdomains - prevSubdomains)
  const removedSubdomains = Array.from(prevSubdomains - currSubdomains)

  Object.entries(curr).forEach(([subdomain, openPorts]) => {
    const prevPorts = new Set(prev[subdomain] || [])
    const currPorts = new Set(curr[subdomain])

    const addedPortsForSubdomain = subtract(currPorts, prevPorts)
    const removedPortsForSubdomain = subtract(prevPorts, currPorts)

    if (addedPortsForSubdomain) {
      addedPorts[subdomain] = Array.from(addedPortsForSubdomain)
    }
    if (removedPortsForSubdomain) {
      removedPorts[subdomain] = Array.from(removedPortsForSubdomain)
    }
  })

  return {
    addedSubdomains,
    removedSubdomains,
    addedPorts,
    removedPorts,
  }
}

const log = (a) => console.info(a)

init().then(analyze).then(log)
