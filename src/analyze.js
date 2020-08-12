import mongoose from 'mongoose'
import { init } from './helpers/init'

const getScans = async () => {
  const Scan = mongoose.model('scan')

  const lastTwoScans = await Scan.find().sort({ created_at: -1 }).limit(2)

  if (lastTwoScans.length !== 2) {
    throw new Error('Not enough records!')
  }

  return lastTwoScans
}

const parseRecord = (record) => {
  const { entries } = record

  return entries.reduce((acc, info) => {
    const [subdomain, openPortsStr] = info.split(' ')
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

    const addedPortsForSubdomain = Array.from(subtract(currPorts, prevPorts))
    const removedPortsForSubdomain = Array.from(subtract(prevPorts, currPorts))

    if (addedPortsForSubdomain.length) {
      addedPorts[subdomain] = addedPortsForSubdomain
    }
    if (removedPortsForSubdomain.length) {
      removedPorts[subdomain] = removedPortsForSubdomain
    }
  })

  return {
    addedSubdomains,
    removedSubdomains,
    addedPorts,
    removedPorts,
  }
}

init()
  .then(analyze)
  .then((results) => {
    // const output = Object.entries(results).map(([k, v]) => {
    //   return `${k}: ${v.length || Object.keys(v).length}`
    // })
    console.info(results)
  })
