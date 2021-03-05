export const createPending = <T>() => {
  const pending: {
    fulfilled: boolean
    promise?: Promise<T>
    resolve?: (data: T) => void
  } = {
    fulfilled: false,
  }
  pending.promise = new Promise<T>((resolve) => {
    pending.resolve = (data: T) => {
      resolve(data)
      pending.fulfilled = true
    }
  })
  return pending as {
    fulfilled: boolean
    promise: Promise<T>
    resolve: (data: T) => void
  }
}
