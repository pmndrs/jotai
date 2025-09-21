import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import { withMount } from 'jotai/vanilla/utils'

describe('withMount', () => {
  it('should call onMount when atom is subscribed and onUnmount when unsubscribed', () => {
    const store = createStore()
    const baseAtom = atom(0)
    const onUnmountFn = vi.fn()
    const onMountFn = vi.fn(() => onUnmountFn)
    const mountedAtom = withMount(baseAtom, onMountFn)
    const unsub = store.sub(mountedAtom, () => {})
    expect(onMountFn).toHaveBeenCalled()
    unsub()
    expect(onUnmountFn).toHaveBeenCalled()
  })

  it('should allow setAtom to be called in onMount', () => {
    const store = createStore()
    const baseAtom = atom(0)
    const onMountFn = vi.fn((setAtom) => {
      setAtom(42)
    })
    const mountedAtom = withMount(baseAtom, onMountFn)
    const unsub = store.sub(mountedAtom, () => {})
    expect(store.get(mountedAtom)).toBe(42)
    unsub()
  })
})
