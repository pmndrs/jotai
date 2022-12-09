async function fakeFetch<Response>(
  response: Response,
  error = false
): Promise<{ response: Response }> {
  if (error) {
    throw new Error('fetch error')
  }
  return { response }
}

export default fakeFetch
