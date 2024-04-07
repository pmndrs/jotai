import LeakDetector from 'jest-leak-detector'
import { expect, it } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'

it('should not have memory leaks with an atom', async () => {
  const store = createStore()
  let detector: LeakDetector
  ;(() => {
    const objAtom = atom({})
    detector = new LeakDetector(store.get(objAtom))
  })()
  const isLeaking = await detector.isLeaking()
  expect(isLeaking).toBe(false)
})
