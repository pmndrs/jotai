import { StrictMode } from 'react'
import { render, waitFor } from '@testing-library/react'
import {
  unstable_Provider as Provider,
  unstable_useAtom as useAtom,
} from 'jotai/react'
import {
  unstable_atom as atom,
  unstable_createStore as createStore,
} from 'jotai/vanilla'

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

  const store = createStore([
    [countAtom, 0],
    [petAtom, 'dog'],
  ])

  const { getByText } = render(
    <StrictMode>
      <Provider store={store}>
        <Display />
      </Provider>
    </StrictMode>
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

  const store = createStore([[petAtom, 'dog']])

  const { getByText } = render(
    <StrictMode>
      <Provider store={store}>
        <Display />
      </Provider>
    </StrictMode>
  )

  await waitFor(() => {
    getByText('count: 1')
    getByText('pet: dog')
  })
})

it('renders correctly without children', () => {
  render(
    <StrictMode>
      <Provider />
    </StrictMode>
  )
})
