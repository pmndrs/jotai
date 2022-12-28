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
