export const chunk = (array, { chunks, chunkSize }) => {
  const N = Math.round(chunks || array.length / chunkSize)

  const result = Array(N)
    .fill(null)
    .map(() => [])

  while (array.length) {
    result[array.length % N].push(array.pop())
  }

  return result
}

export const shuffleArray = (array) => {
  const output = [...array]

  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[output[i], output[j]] = [output[j], output[i]]
  }

  return output
}

export const reverseDomainName = (s) => {
  const [d, p] = s.split(' ')
  return `${d.split('.').reverse().join('.')} ${p}`
}
