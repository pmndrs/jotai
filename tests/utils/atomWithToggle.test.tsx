import React, { Fragment } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider as ProviderOrig, useAtom } from '../../src/index'
import { atomWithToggle } from '../../src/utils'

const Provider = process.env.PROVIDER_LESS_MODE ? Fragment : ProviderOrig

it('simple toggle', async () => {
  const activeAtom = atomWithToggle(true)

  const Toggle: React.FC = () => {
    const [isActive, toggle] = useAtom(activeAtom)
    return (
      <>
        <div>isActive: {isActive + ''}</div>
        <button onClick={() => toggle()}>toggle</button>
        <button onClick={() => toggle(true)}>force true</button>
        <button onClick={() => toggle(false)}>force false</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Toggle />
    </Provider>
  )

  await findByText('isActive: true')

  fireEvent.click(getByText('toggle'))
  await findByText('isActive: false')

  fireEvent.click(getByText('toggle'))
  await findByText('isActive: true')

  fireEvent.click(getByText('force true'))
  await findByText('isActive: true')

  fireEvent.click(getByText('force false'))
  await findByText('isActive: false')

  fireEvent.click(getByText('force true'))
  await findByText('isActive: true')
})

const storageData: Record<string, boolean> = {
  isActive: false,
}
const dummyStorage = {
  getItem: (key: string) => {
    if (!(key in storageData)) {
      throw new Error('no value stored')
    }
    return storageData[key]
  },
  setItem: (key: string, newValue: boolean) => {
    storageData[key] = newValue
  },
}

it('simple toggle with storage', async () => {
  const activeAtom = atomWithToggle(false, 'isActive', dummyStorage)

  const Toggle: React.FC = () => {
    const [isActive, toggle] = useAtom(activeAtom)
    return (
      <>
        <div>isActive: {isActive + ''}</div>
        <button onClick={() => toggle()}>toggle</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Toggle />
    </Provider>
  )

  await findByText('isActive: false')

  fireEvent.click(getByText('toggle'))
  await findByText('isActive: true')
  expect(storageData.isActive).toBe(true)

  fireEvent.click(getByText('toggle'))
  await findByText('isActive: false')
  expect(storageData.isActive).toBe(false)
})
