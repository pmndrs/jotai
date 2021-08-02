export type WeakCache<T> = WeakMap<object, [WeakCache<T>] | [WeakCache<T>, T]>

const _getWeakCacheItem = <T>(cache: WeakCache<T>, deps: readonly object[]) => {
  const [dep, ...rest] = deps
  const entry = cache.get(dep)
  if (!entry) {
    return
  }
  if (!rest.length) {
    return entry[1]
  }
  return () => _getWeakCacheItem(entry[0], rest)
}

const _setWeakCacheItem = <T>(
  cache: WeakCache<T>,
  deps: readonly object[],
  item: T
) => {
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
  return () => _setWeakCacheItem(entry![0], rest, item)
}

const trampoline =
  <T extends Function>(fn: T) =>
  (...args: unknown[]) => {
    let res = fn(...args)
    while (typeof res === 'function') {
      res = res()
    }
    return res
  }

export const getWeakCacheItem: <T>(
  ...args: Parameters<typeof _getWeakCacheItem>
) => T | undefined = trampoline(_getWeakCacheItem)
export const setWeakCacheItem: <T>(
  ...args: Parameters<typeof _setWeakCacheItem>
) => void | undefined = trampoline(_setWeakCacheItem)
