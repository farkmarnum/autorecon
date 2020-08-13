import dns from 'dns'

export const getUniqueHosts = async (subdomains) => {
  console.info('Getting IP address for subdomains...')
  const { Resolver } = dns.promises
  const resolver = new Resolver()

  const IPsAndSubdomains = (
    await Promise.all(
      subdomains.map(async (subdomain) => {
        try {
          const [ip] = await resolver.resolve(subdomain)
          return [ip, subdomain]
        } catch (err) {
          if (['ENODATA', 'ENOTFOUND'].includes(err.code)) {
            return null
          }
          throw err
        }
      }),
    )
  ).filter((a) => a)

  const seenIPs = new Set()
  const uniqueHosts = []

  IPsAndSubdomains.forEach(([ip, subdomain]) => {
    if (seenIPs.has(ip)) return

    seenIPs.add(ip)
    uniqueHosts.push(subdomain)
  })

  return uniqueHosts
}
