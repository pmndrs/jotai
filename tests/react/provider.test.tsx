import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Provider, useAtom } from 'jotai/react'
import { atom, createStore } from 'jotai/vanilla'

it('uses initial values from provider', () => {
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

  const store = createStore()
  store.set(countAtom, 0)
  store.set(petAtom, 'dog')

  render(
    <StrictMode>
      <Provider store={store}>
        <Display />
      </Provider>
    </StrictMode>,
  )

  expect(screen.getByText('count: 0')).toBeInTheDocument()
  expect(screen.getByText('pet: dog')).toBeInTheDocument()
})

it('only uses initial value from provider for specific atom', () => {
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

  const store = createStore()
  store.set(petAtom, 'dog')

  render(
    <StrictMode>
      <Provider store={store}>
        <Display />
      </Provider>
    </StrictMode>,
  )

  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(screen.getByText('pet: dog')).toBeInTheDocument()
})

it('renders correctly without children', () => {
  render(
    <StrictMode>
      <Provider />
    </StrictMode>,
  )
})
