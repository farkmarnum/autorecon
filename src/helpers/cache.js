import fs from 'fs'

const CACHE_DIR = `/tmp/autorecon/cache`

export const DOMAIN_CACHE = `${CACHE_DIR}/domain_information`
export const SUBDOMAIN_CACHE = `${CACHE_DIR}/subdomain_information`
export const PORT_CACHE = `${CACHE_DIR}/port_information`

try {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
} catch (err) {
  if (err.code !== 'EEXIST') throw err
}

export const readCache = (fname) => {
  try {
    const data = JSON.parse(fs.readFileSync(fname))
    if (data) {
      console.info(`Using cached data in ${fname}`)
      return data
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }
  return undefined
}

export const writeCache = (fname, data) => {
  try {
    fs.writeFileSync(fname, JSON.stringify(data))
  } catch (err) {
    console.error(err)
  }
}

export const clearCache = () => {
  try {
    ;[DOMAIN_CACHE, SUBDOMAIN_CACHE, PORT_CACHE].forEach(fs.unlinkSync)
  } catch (err) {
    console.error(err)
  }
}
