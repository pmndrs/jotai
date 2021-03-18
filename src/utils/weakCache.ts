export type Cache<T> = WeakMap<object, [Cache<T>] | [Cache<T>, T | undefined]>

export const getWeakCacheItem = <T>(
  cache: Cache<T>,
  deps: readonly object[]
): T | undefined => {
  const [dep, ...rest] = deps
  const entry = cache.get(dep)
  if (!entry) {
    return
  }
  const [nextCache, derivedAtom] = entry
  if (!rest.length) {
    return derivedAtom
  }
  return getWeakCacheItem(nextCache, rest)
}

export const setWeakCacheItem = <T>(
  cache: Cache<T>,
  deps: readonly object[],
  item: T
): void => {
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
  setWeakCacheItem(entry[0], rest, item)
}
