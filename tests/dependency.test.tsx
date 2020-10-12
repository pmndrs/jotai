import React, { Suspense, useEffect, useRef } from 'react'
import { fireEvent, cleanup, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../src/index'

const consoleError = console.error
afterEach(() => {
  cleanup()
  console.error = consoleError
})

it('works with 2 level dependencies', async () => {
  const countAtom = atom(1)
  const doubledAtom = atom((get) => get(countAtom) * 2)
  const tripledAtom = atom((get) => get(doubledAtom) * 3)

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    const [doubledCount] = useAtom(doubledAtom)
    const [tripledCount] = useAtom(tripledAtom)
    const commits = useRef(1)
    useEffect(() => {
      ++commits.current
    })
    return (
      <>
        <div>
          commits: {commits.current}, count: {count}, doubled: {doubledCount},
          tripled: {tripledCount}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('commits: 1, count: 1, doubled: 2, tripled: 6')

  fireEvent.click(getByText('button'))
  await findByText('commits: 2, count: 2, doubled: 4, tripled: 12')
})

it('works a primitive atom and a dependent async atom', async () => {
  const countAtom = atom(1)
  const doubledAtom = atom(async (get) => {
    await new Promise((r) => setTimeout(r, 10))
    return get(countAtom) * 2
  })

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    const [doubledCount] = useAtom(doubledAtom)
    return (
      <>
        <div>
          count: {count}, doubled: {doubledCount}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 1, doubled: 2')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('count: 2, doubled: 4')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('count: 3, doubled: 6')
})
