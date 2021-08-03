export type WeakCache<T> = WeakMap<object, [WeakCache<T>] | [WeakCache<T>, T]>

export const getWeakCacheItem = <T>(
  cache: WeakCache<T>,
  deps: readonly object[]
): T | undefined => {
  while (true) {
    const [dep, ...rest] = deps
    const entry = cache.get(dep)
    if (!entry) {
      return
    }
    if (!rest.length) {
      return entry[1]
    }
    cache = entry[0]
    deps = rest
  }
}

export const setWeakCacheItem = <T>(
  cache: WeakCache<T>,
  deps: readonly object[],
  item: T
): void => {
  while (true) {
    const [dep, ...rest] = deps
    let entry = cache.get(dep)
    if (!entry) {
      entry = [new WeakMap()]
      cache.set(dep, entry)
    }
    if (!rest.length) {
      entry[1] = item
      return
    }
    cache = entry[0]
    deps = rest
  }
}
