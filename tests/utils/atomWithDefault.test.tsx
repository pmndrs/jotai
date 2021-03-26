import React, { Fragment, Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider as ProviderOrig, atom, useAtom } from '../../src/index'
import { atomWithDefault } from '../../src/utils'

const Provider = process.env.PROVIDER_LESS_MODE ? Fragment : ProviderOrig

it('simple sync get default', async () => {
  const count1Atom = atom(1)
  const count2Atom = atomWithDefault((get) => get(count1Atom) * 2)

  const Counter: React.FC = () => {
    const [count1, setCount1] = useAtom(count1Atom)
    const [count2, setCount2] = useAtom(count2Atom)
    return (
      <>
        <div>
          count1: {count1}, count2: {count2}
        </div>
        <button onClick={() => setCount1((c) => c + 1)}>button1</button>
        <button onClick={() => setCount2((c) => c + 1)}>button2</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count1: 1, count2: 2')

  fireEvent.click(getByText('button1'))
  await findByText('count1: 2, count2: 4')

  fireEvent.click(getByText('button2'))
  await findByText('count1: 2, count2: 5')

  fireEvent.click(getByText('button1'))
  await findByText('count1: 3, count2: 5')
})

it('simple sync set default', async () => {
  const count1Atom = atom(1)
  const count2Atom = atomWithDefault(
    (get) => get(count1Atom) * 2,
    (get, set) => {
      set(count2Atom, get(count1Atom) * 5)
    }
  )

  const Counter: React.FC = () => {
    const [count1, setCount1] = useAtom(count1Atom)
    const [count2, setCount2] = useAtom(count2Atom)
    return (
      <>
        <div>
          count1: {count1}, count2: {count2}
        </div>
        <button onClick={() => setCount1((c) => c + 1)}>button1</button>
        <button onClick={() => setCount2('asd')}>button2</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count1: 1, count2: 2')

  fireEvent.click(getByText('button1'))
  await findByText('count1: 2, count2: 4')

  fireEvent.click(getByText('button2'))
  await findByText('count1: 2, count2: 10')

  fireEvent.click(getByText('button1'))
  await findByText('count1: 3, count2: 10')
})

it('simple async get default', async () => {
  const count1Atom = atom(1)
  const count2Atom = atomWithDefault(async (get) => {
    await new Promise((r) => setTimeout(r, 10))
    return get(count1Atom) * 2
  })

  const Counter: React.FC = () => {
    const [count1, setCount1] = useAtom(count1Atom)
    const [count2, setCount2] = useAtom(count2Atom)
    return (
      <>
        <div>
          count1: {count1}, count2: {count2}
        </div>
        <button onClick={() => setCount1((c) => c + 1)}>button1</button>
        <button onClick={() => setCount2((c) => c + 1)}>button2</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count1: 1, count2: 2')

  fireEvent.click(getByText('button1'))
  await findByText('loading')
  await findByText('count1: 2, count2: 4')

  fireEvent.click(getByText('button2'))
  await findByText('count1: 2, count2: 5')

  fireEvent.click(getByText('button1'))
  await findByText('count1: 3, count2: 5')
})

it('simple async set default', async () => {
  const count1Atom = atom(1)
  const count2Atom = atomWithDefault(
    async (get) => {
      await new Promise((r) => setTimeout(r, 10))
      return get(count1Atom) * 2
    },
    async (get, set, update: number) => {
      await new Promise((r) => setTimeout(r, 10))
      set(count2Atom, get(count1Atom) * update)
    }
  )

  const Counter: React.FC = () => {
    const [count1, setCount1] = useAtom(count1Atom)
    const [count2, setCount2] = useAtom(count2Atom)
    return (
      <>
        <div>
          count1: {count1}, count2: {count2}
        </div>
        <button onClick={() => setCount1((c) => c + 1)}>button1</button>
        <button onClick={() => setCount2(5)}>button2</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count1: 1, count2: 2')

  fireEvent.click(getByText('button1'))
  await findByText('loading')
  await findByText('count1: 2, count2: 4')

  fireEvent.click(getByText('button2'))
  await findByText('count1: 2, count2: 10')

  fireEvent.click(getByText('button1'))
  await findByText('count1: 3, count2: 10')
})
