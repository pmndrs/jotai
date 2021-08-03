export type WeakCache<T> = WeakMap<object, [WeakCache<T>] | [WeakCache<T>, T]>

export const getWeakCacheItem = <T>(
  cache: WeakCache<T>,
  deps: readonly object[]
): T | undefined => {
  for (const [index, dep] of deps.entries()) {
    const entry = cache.get(dep)
    if (!entry) {
      return
    }
    const rest = deps.slice(index + 1)
    if (!rest.length) {
      return entry[1]
    }
  }
}

export const setWeakCacheItem = <T>(
  cache: WeakCache<T>,
  deps: readonly object[],
  item: T
): void => {
  for (const [index, dep] of deps.entries()) {
    let entry = cache.get(dep)
    if (!entry) {
      entry = [new WeakMap()]
      cache.set(dep, entry)
    }
    const rest = deps.slice(index + 1)
    if (!rest.length) {
      entry[1] = item
      return
    }
  }
}
