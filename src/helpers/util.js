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
