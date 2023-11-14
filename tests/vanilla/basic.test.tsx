import { expect, it } from 'vitest'
import { atom } from 'jotai/vanilla'

it('creates atoms', () => {
  // primitive atom
  const countAtom = atom(0)
  const anotherCountAtom = atom(1)
  // read-only derived atom
  const doubledCountAtom = atom((get) => get(countAtom) * 2)
  // read-write derived atom
  const sumCountAtom = atom(
    (get) => get(countAtom) + get(anotherCountAtom),
    (get, set, value: number) => {
      set(countAtom, get(countAtom) + value / 2)
      set(anotherCountAtom, get(anotherCountAtom) + value / 2)
    },
  )
  // write-only derived atom
  const decrementCountAtom = atom(null, (get, set) => {
    set(countAtom, get(countAtom) - 1)
  })
  expect({
    countAtom,
    doubledCountAtom,
    sumCountAtom,
    decrementCountAtom,
  }).toMatchInlineSnapshot(`
    {
      "countAtom": {
        "init": 0,
        "read": [Function],
        "toString": [Function],
        "write": [Function],
      },
      "decrementCountAtom": {
        "init": null,
        "read": [Function],
        "toString": [Function],
        "write": [Function],
      },
      "doubledCountAtom": {
        "read": [Function],
        "toString": [Function],
      },
      "sumCountAtom": {
        "read": [Function],
        "toString": [Function],
        "write": [Function],
      },
    }
  `)
})

it('should let users mark atoms as private', () => {
  const internalAtom = atom(0)
  internalAtom.debugPrivate = true

  expect(internalAtom).toMatchInlineSnapshot(`
    {
      "debugPrivate": true,
      "init": 0,
      "read": [Function],
      "toString": [Function],
      "write": [Function],
    }
  `)
})
