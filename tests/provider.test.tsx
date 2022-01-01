import { render, waitFor } from '@testing-library/react'
import { atom, useAtom } from 'jotai'
import { getTestProvider } from './testUtils'

const Provider = getTestProvider(true)

it('uses initial values from provider', async () => {
  const countAtom = atom(1)
  const petAtom = atom('cat')

  const Display = () => {
    const [count] = useAtom(countAtom)
    const [pet] = useAtom(petAtom)

    return (
      <>
        <p>count: {count}</p>
        <p>pet: {pet}</p>
      </>
    )
  }

  const { getByText } = render(
    <Provider
      initialValues={[
        [countAtom, 0],
        [petAtom, 'dog'],
      ]}>
      <Display />
    </Provider>
  )

  await waitFor(() => {
    getByText('count: 0')
    getByText('pet: dog')
  })
})

it('only uses initial value from provider for specific atom', async () => {
  const countAtom = atom(1)
  const petAtom = atom('cat')

  const Display = () => {
    const [count] = useAtom(countAtom)
    const [pet] = useAtom(petAtom)

    return (
      <>
        <p>count: {count}</p>
        <p>pet: {pet}</p>
      </>
    )
  }

  const { getByText } = render(
    <Provider initialValues={[[petAtom, 'dog']]}>
      <Display />
    </Provider>
  )

  await waitFor(() => {
    getByText('count: 1')
    getByText('pet: dog')
  })
})

it('renders correctly without children', () => {
  render(<Provider />)
})
