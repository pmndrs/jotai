import LeakDetector from 'jest-leak-detector'
import { expect, it } from 'vitest'
import { Atom, atom, createStore } from 'jotai/vanilla'

it('should not hold onto atoms that are not mounted', async () => {
  const store = createStore()

  let objAtom: Atom<unknown> | undefined = atom({})
  const detector = new LeakDetector(objAtom)
  store.get(objAtom)
  objAtom = undefined

  await expect(detector.isLeaking()).resolves.toBe(false)
})

it('should not hold onto dependent atoms that are not mounted', async () => {
  const store = createStore()

  const objAtom = atom({})
  let depAtom: Atom<unknown> | undefined = atom((get) => get(objAtom))
  const detector = new LeakDetector(depAtom)
  store.get(depAtom)
  depAtom = undefined

  await expect(detector.isLeaking()).resolves.toBe(false)
})
