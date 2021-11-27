async function fakeFetch<Response>(
  response: Response,
  error = false,
  time = 0
): Promise<{ response: Response }> {
  await new Promise((r) => setTimeout(r, time))
  if (error) {
    throw new Error()
  }
  return { response }
}

export default fakeFetch
