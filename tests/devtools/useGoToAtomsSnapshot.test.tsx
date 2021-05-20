import React, { Suspense, useRef } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { Provider, atom, useAtom } from '../../src/index'
import { useAtomsSnapshot, useGoToAtomsSnapshot } from '../../src/devtools'

it('useGoToAtomsSnapshot should modify atoms snapshot', async () => {
  const petAtom = atom('cat')
  const colorAtom = atom('blue')

  const DisplayAtoms: React.FC = () => {
    const [pet] = useAtom(petAtom)
    const [color] = useAtom(colorAtom)
    return (
      <>
        <p>{pet}</p>
        <p>{color}</p>
      </>
    )
  }

  const UpdateSnapshot: React.FC = () => {
    const snapshot = useAtomsSnapshot()
    const goToSnapshot = useGoToAtomsSnapshot()
    return (
      <button
        onClick={() => {
          const newSnapshot = new Map(snapshot)
          newSnapshot.set(petAtom, 'dog')
          newSnapshot.set(colorAtom, 'green')
          goToSnapshot(newSnapshot)
        }}>
        click
      </button>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <DisplayAtoms />
      <UpdateSnapshot />
    </Provider>
  )

  await findByText('cat')
  await findByText('blue')
  fireEvent.click(getByText('click'))
  await findByText('dog')
  await findByText('green')
})

it('useGoToAtomsSnapshot should work with derived atoms', async () => {
  const priceAtom = atom(10)
  const taxAtom = atom((get) => get(priceAtom) * 0.2)

  const DisplayPrice: React.FC = () => {
    const [price] = useAtom(priceAtom)
    const [tax] = useAtom(taxAtom)
    return (
      <>
        <p>price: {price}</p>
        <p>tax: {tax}</p>
      </>
    )
  }

  const UpdateSnapshot: React.FC = () => {
    const snapshot = useAtomsSnapshot()
    const goToSnapshot = useGoToAtomsSnapshot()
    return (
      <button
        onClick={() => {
          const newSnapshot = new Map(snapshot)
          newSnapshot.set(priceAtom, 20)
          goToSnapshot(newSnapshot)
        }}>
        click
      </button>
    )
  }

  const { getByText } = render(
    <Provider>
      <DisplayPrice />
      <UpdateSnapshot />
    </Provider>
  )

  await waitFor(() => {
    getByText('price: 10')
    getByText('tax: 2')
  })
  fireEvent.click(getByText('click'))
  await waitFor(() => {
    getByText('price: 20')
    getByText('tax: 4')
  })
})

it('useGoToAtomsSnapshot should work with async derived atoms', async () => {
  const priceAtom = atom(10)
  const taxAtom = atom(async (get) => {
    await new Promise((r) => setTimeout(r, 10))
    return get(priceAtom) * 0.2
  })

  const DisplayPrice: React.FC = () => {
    const [price] = useAtom(priceAtom)
    const [tax] = useAtom(taxAtom)
    return (
      <>
        <p>price: {price}</p>
        <p>tax: {tax}</p>
      </>
    )
  }

  const UpdateSnapshot: React.FC = () => {
    const snapshot = useAtomsSnapshot()
    const goToSnapshot = useGoToAtomsSnapshot()
    return (
      <button
        onClick={() => {
          const newSnapshot = new Map(snapshot)
          newSnapshot.set(priceAtom, 20)
          goToSnapshot(newSnapshot)
        }}>
        click
      </button>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <DisplayPrice />
        <UpdateSnapshot />
      </Suspense>
    </Provider>
  )

  await waitFor(() => {
    getByText('price: 10')
    getByText('tax: 2')
  })
  fireEvent.click(getByText('click'))
  await findByText('loading')
  await waitFor(() => {
    getByText('price: 20')
    getByText('tax: 4')
  })
})

it('useGoToAtomsSnapshot should work with original snapshot', async () => {
  const priceAtom = atom(10)
  const taxAtom = atom((get) => get(priceAtom) * 0.2)

  const DisplayPrice: React.FC = () => {
    const [price, setPrice] = useAtom(priceAtom)
    const [tax] = useAtom(taxAtom)
    return (
      <>
        <p>price: {price}</p>
        <p>tax: {tax}</p>
        <button onClick={() => setPrice((price) => price * 2)}>
          new price
        </button>
      </>
    )
  }

  const UpdateSnapshot: React.FC = () => {
    const snapshot = useAtomsSnapshot()
    const snapshotRef = useRef(snapshot)
    const goToSnapshot = useGoToAtomsSnapshot()
    return (
      <button
        onClick={() => {
          const newSnapshot = new Map(snapshotRef.current)
          goToSnapshot(newSnapshot)
        }}>
        snapshot
      </button>
    )
  }

  const { getByText } = render(
    <Provider>
      <DisplayPrice />
      <UpdateSnapshot />
    </Provider>
  )

  await waitFor(() => {
    getByText('price: 10')
    getByText('tax: 2')
  })
  fireEvent.click(getByText('new price'))
  await waitFor(() => {
    getByText('price: 20')
    getByText('tax: 4')
  })
  fireEvent.click(getByText('snapshot'))
  await waitFor(() => {
    getByText('price: 10')
    getByText('tax: 2')
  })
})
