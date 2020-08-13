import dns from 'dns'

const MAX_ATTEMPTS = 3

export const getHostsByIp = async (subdomains) => {
  console.info('Getting IP addresses for subdomains...')
  const { Resolver } = dns.promises
  const resolver = new Resolver('4.4.4.4')
  resolver.setServers([
    // Google:
    '8.8.8.8',
    '8.8.4.4',

    // CloudFlare:
    '1.1.1.1',
    '1.0.0.1',

    // OpenDNS:
    '208.67.222.222',
    '208.67.220.220',
  ])

  const hostNamesByIp = {}

  await Promise.all(
    subdomains.map(async (subdomain) => {
      const getIps = async (attempts = 0) => {
        try {
          return await resolver.resolve(subdomain)
        } catch (err) {
          if (attempts >= MAX_ATTEMPTS) {
            console.error(`${err.code}, out of retries for ${subdomain}`)
            return []
          }
          return getIps(attempts + 1)
        }
      }

      const ips = await getIps()

      ips.forEach((ip) => {
        if (!hostNamesByIp[ip]) {
          hostNamesByIp[ip] = []
        }
        hostNamesByIp[ip].push(subdomain)
      })
    }),
  )

  console.info('IP addresses complete')
  return hostNamesByIp
}
