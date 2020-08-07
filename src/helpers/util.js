export const chunk = (array, N) => {
  const result = Array(N)
    .fill(null)
    .map(() => [])

  while (array.length) {
    result[array.length % N].push(array.pop())
  }

  return result
}
