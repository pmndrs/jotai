import { atom, createStore } from 'jotai/vanilla'

it('should not fire on subscribe', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const callback1 = jest.fn()
  const callback2 = jest.fn()
  store.sub(countAtom, callback1)
  store.sub(countAtom, callback2)
  expect(callback1).not.toBeCalled()
  expect(callback2).not.toBeCalled()
})

it('should not fire subscription if primitive atom value is the same', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const callback = jest.fn()
  store.sub(countAtom, callback)
  const calledTimes = callback.mock.calls.length
  store.set(countAtom, 0)
  expect(callback).toBeCalledTimes(calledTimes)
})

it('should not fire subscription if derived atom value is the same', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const derivedAtom = atom((get) => get(countAtom) * 0)
  const callback = jest.fn()
  store.sub(derivedAtom, callback)
  const calledTimes = callback.mock.calls.length
  store.set(countAtom, 1)
  expect(callback).toBeCalledTimes(calledTimes)
})
