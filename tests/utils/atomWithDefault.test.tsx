import React, { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { atom, useAtom } from '../../src/index'
import { atomWithDefault } from '../../src/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

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

it('async chain for get default (#443)', async () => {
  const num1Atom = atom(async () => {
    await new Promise((r) => setTimeout(r, 10))
    return 1
  })
  const num2Atom = atom(async () => {
    await new Promise((r) => setTimeout(r, 10))
    return 2
  })

  // "async" is required to reproduce the issue
  const sumAtom = atom(async (get) => get(num1Atom) + get(num2Atom))
  const countAtom = atomWithDefault((get) => get(sumAtom))

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
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
  await findByText('count: 3')

  fireEvent.click(getByText('button'))
  await findByText('count: 4')
})
