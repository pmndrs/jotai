async function fakeFetch<Response>(
  response: Response,
  error: boolean = false,
  time: number = 0
): Promise<{ response: Response }> | never {
  await new Promise((r) => setTimeout(r, time))
  if (!error) {
    return { response }
  }
  throw new Error()
}
export default fakeFetch
