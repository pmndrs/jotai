import { expect, it } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'

it('can propagate updates with async atom chains', async () => {
  const store = createStore()

  const countAtom = atom(1)
  let resolve = () => {}
  const asyncAtom = atom(async (get) => {
    const count = get(countAtom)
    await new Promise<void>((r) => (resolve = r))
    return count
  })
  const async2Atom = atom((get) => get(asyncAtom))
  const async3Atom = atom((get) => get(async2Atom))

  expect(store.get(async3Atom) instanceof Promise).toBeTruthy()
  resolve()
  await expect(store.get(async3Atom)).resolves.toBe(1)

  store.set(countAtom, (c) => c + 1)
  expect(store.get(async3Atom) instanceof Promise).toBeTruthy()
  resolve()
  await expect(store.get(async3Atom)).resolves.toBe(2)

  store.set(countAtom, (c) => c + 1)
  expect(store.get(async3Atom) instanceof Promise).toBeTruthy()
  resolve()
  await expect(store.get(async3Atom)).resolves.toBe(3)
})

it('can get async atom with deps more than once before resolving (#1668)', async () => {
  const countAtom = atom(0)

  const resolve: (() => void)[] = []
  const asyncAtom = atom(async (get) => {
    const count = get(countAtom)
    await new Promise<void>((r) => resolve.push(r))
    return count
  })

  const store = createStore()

  store.set(countAtom, (c) => c + 1)
  store.get(asyncAtom)
  store.set(countAtom, (c) => c + 1)
  const promise = store.get(asyncAtom)
  resolve.shift()?.()
  await Promise.resolve()
  resolve.shift()?.()
  const count = await promise
  expect(count).toBe(2)
})

it('correctly updates async derived atom after get/set update', async () => {
  const baseAtom = atom(0)
  const derivedAsyncAtom = atom(
    async (get) => get(baseAtom) + 1,
    async (_get, set, val) => set(baseAtom, val as number),
  )

  const store = createStore()

  // NOTE: Have to .set() straight after await on .get(), so that it executes
  // in the same JS event loop cycle!
  let derived = await store.get(derivedAsyncAtom)
  await store.set(derivedAsyncAtom, 2)

  expect(derived).toBe(1)
  expect(store.get(baseAtom)).toBe(2)

  derived = await store.get(derivedAsyncAtom)
  expect(derived).toBe(3)
})

it('correctly handles the same promise being returned twice from an atom getter (#2151)', async () => {
  const asyncDataAtom = atom(async () => {
    return 'Asynchronous Data'
  })

  const counterAtom = atom(0)

  const derivedAtom = atom((get) => {
    get(counterAtom) // depending on sync data
    return get(asyncDataAtom) // returning a promise from another atom
  })

  const store = createStore()

  store.get(derivedAtom)
  // setting the `counterAtom` dependency on the same JS event loop cycle, before
  // the `derivedAtom` promise resolves.
  store.set(counterAtom, 1)
  await expect(store.get(derivedAtom)).resolves.toBe('Asynchronous Data')
})
