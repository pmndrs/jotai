export type ImmutableMap<K, V> = Map<K, V>[]

const MAX_CHAIN_LENGTH = 10
const SMALL_MAP_SIZE = 10

// V has to be non falsy
type MCreate = <K, V>() => ImmutableMap<K, V>
type MGet = <K, V>(m: ImmutableMap<K, V>, k: K) => V | undefined
type MSet = <K, V>(m: ImmutableMap<K, V>, k: K, v: V) => ImmutableMap<K, V>
type MDel = <K, V>(m: ImmutableMap<K, V>, k: K) => ImmutableMap<K, V>
type MForEach = <K extends object, V>(
  m: ImmutableMap<K, V>,
  cb: (value: V, key: K) => void
) => void
type MMerge = <K, V>(
  m: ImmutableMap<K, V>,
  newM: ImmutableMap<K, V>
) => ImmutableMap<K, V>
type MToPrintable = <K, V>(
  m: ImmutableMap<K, V>,
  toPrintableK: (k: K) => unknown,
  toPrintableV: (v: V) => unknown
) => unknown

export const mCreate: MCreate = <K, V>() => [new Map<K, V>()]

export const mGet: MGet = <K, V>(m: ImmutableMap<K, V>, k: K) => {
  for (let i = 0; i < m.length; ++i) {
    const v = m[i].get(k)
    if (v) {
      return v
    }
  }
}

const squash = <K, V>(m: ImmutableMap<K, V>) => {
  let i = m.length - 1
  const dst = new Map<K, V>(m[i])
  while (i) {
    --i
    m[i].forEach((v, k) => {
      dst.set(k, v)
    })
  }
  return [dst]
}

export const mSet: MSet = <K, V>(m: ImmutableMap<K, V>, k: K, v: V) => {
  if (m[0].size < SMALL_MAP_SIZE) {
    return [new Map(m[0]).set(k, v), ...m.slice(1)]
  }
  if (m.length >= MAX_CHAIN_LENGTH) {
    m = squash(m)
  }
  return [new Map([[k, v]]), ...m]
}

export const mDel: MDel = <K, V>(m: ImmutableMap<K, V>, k: K) => {
  if (m.length > 1) {
    m = squash(m)
  }
  const map = new Map(m[0])
  map.delete(k)
  return [map]
}

export const mForEach: MForEach = <K extends object, V>(
  map: ImmutableMap<K, V>,
  cb: (value: V, key: K) => void
) => {
  const seen = new WeakSet()
  map.forEach((m) => {
    m.forEach((v, k) => {
      if (!seen.has(k)) {
        cb(v, k)
        seen.add(k)
      }
    })
  })
}

export const mMerge: MMerge = <K, V>(
  m: ImmutableMap<K, V>,
  newM: ImmutableMap<K, V>
) => {
  m = [...newM, ...m]
  if (m.length > MAX_CHAIN_LENGTH) {
    m = squash(m)
  }
  return m
}

export const mToPrintable: MToPrintable = <K, V>(
  m: ImmutableMap<K, V>,
  toPrintableK: (k: K) => unknown,
  toPrintableV: (v: V) => unknown
) => {
  if (m.length > 1) {
    m = squash(m)
  }
  return new Map(
    [...m[0].entries()].map(([k, v]) => [toPrintableK(k), toPrintableV(v)])
  )
}
