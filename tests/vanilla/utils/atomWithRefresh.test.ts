import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'jotai/vanilla'
import { atomWithRefresh } from 'jotai/vanilla/utils'

describe('atomWithRefresh', () => {
  it('throws when refresh is called with extra arguments', () => {
    const atom = atomWithRefresh(() => {})
    const store = createStore()
    const args = ['some arg'] as unknown as []
    expect(() => store.set(atom, ...args)).throws()
  })
})
