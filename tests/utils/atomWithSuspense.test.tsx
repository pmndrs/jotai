import { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { useAtom, useSetAtom } from 'jotai'
import { atomWithSuspense } from 'jotai/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('atomWithSuspense', async () => {
  const countAtom = atomWithSuspense<number>()

  const SetCounter = () => {
    const setCount = useSetAtom(countAtom)
    return <button onClick={() => setCount(0)}>button1</button>
  }

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button2</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <SetCounter />
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('loading')

  fireEvent.click(getByText('button1'))
  await findByText('count: 0')

  fireEvent.click(getByText('button2'))
  await findByText('count: 1')

  fireEvent.click(getByText('button2'))
  await findByText('count: 2')

  fireEvent.click(getByText('button1'))
  await findByText('count: 0')

  fireEvent.click(getByText('button2'))
  await findByText('count: 1')
})
