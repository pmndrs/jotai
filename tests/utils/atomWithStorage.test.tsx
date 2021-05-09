import React, { Fragment } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider as ProviderOrig, useAtom } from '../../src/index'
import { atomWithStorage } from '../../src/utils'

const Provider = process.env.PROVIDER_LESS_MODE ? Fragment : ProviderOrig

const storageData: Record<string, number> = {
  count: 10,
}
const dummyStorage = {
  getItem: (key: string) => {
    if (!(key in storageData)) {
      throw new Error('no value stored')
    }
    return storageData[key]
  },
  setItem: (key: string, newValue: number) => {
    storageData[key] = newValue
  },
}

it('simple count', async () => {
  const countAtom = atomWithStorage('count', 1, dummyStorage)

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
      <Counter />
    </Provider>
  )

  await findByText('count: 10')

  fireEvent.click(getByText('button'))
  await findByText('count: 11')
  expect(storageData.count).toBe(11)
})
