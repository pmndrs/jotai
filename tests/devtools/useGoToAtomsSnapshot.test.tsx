import { Suspense, useEffect, useRef } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { Provider, atom, useAtom } from 'jotai'
import type { Atom } from 'jotai'
import { useAtomsSnapshot, useGotoAtomsSnapshot } from 'jotai/devtools'

it('useGotoAtomsSnapshot should modify atoms snapshot', async () => {
  const petAtom = atom('cat')
  const colorAtom = atom('blue')

  const DisplayAtoms = () => {
    const [pet] = useAtom(petAtom)
    const [color] = useAtom(colorAtom)
    return (
      <>
        <p>{pet}</p>
        <p>{color}</p>
      </>
    )
  }

  const UpdateSnapshot = () => {
    const snapshot = useAtomsSnapshot()
    const goToSnapshot = useGotoAtomsSnapshot()
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

it('useGotoAtomsSnapshot should work with derived atoms', async () => {
  const priceAtom = atom(10)
  const taxAtom = atom((get) => get(priceAtom) * 0.2)

  const DisplayPrice = () => {
    const [price] = useAtom(priceAtom)
    const [tax] = useAtom(taxAtom)
    return (
      <>
        <p>price: {price}</p>
        <p>tax: {tax}</p>
      </>
    )
  }

  const UpdateSnapshot = () => {
    const snapshot = useAtomsSnapshot()
    const goToSnapshot = useGotoAtomsSnapshot()
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

it('useGotoAtomsSnapshot should work with async derived atoms', async () => {
  const priceAtom = atom(10)
  const taxAtom = atom(async (get) => {
    await new Promise((r) => setTimeout(r, 10))
    return get(priceAtom) * 0.2
  })

  const DisplayPrice = () => {
    const [price] = useAtom(priceAtom)
    const [tax] = useAtom(taxAtom)
    return (
      <>
        <p>price: {price}</p>
        <p>tax: {tax}</p>
      </>
    )
  }

  const UpdateSnapshot = () => {
    const snapshot = useAtomsSnapshot()
    const goToSnapshot = useGotoAtomsSnapshot()
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

it('useGotoAtomsSnapshot should work with original snapshot', async () => {
  const priceAtom = atom(10)
  const taxAtom = atom((get) => get(priceAtom) * 0.2)

  const DisplayPrice = () => {
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

  const UpdateSnapshot = () => {
    const snapshot = useAtomsSnapshot()
    const snapshotRef = useRef<Map<Atom<unknown>, unknown>>()
    useEffect(() => {
      if (snapshot.size && !snapshotRef.current) {
        // save first snapshot
        snapshotRef.current = snapshot
      }
    })
    const goToSnapshot = useGotoAtomsSnapshot()
    return (
      <button
        onClick={() => {
          if (!snapshotRef.current) {
            throw new Error('snapshot is not ready yet')
          }
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

it('useGotoAtomsSnapshot should respect atom scope', async () => {
  const scope = Symbol()
  const petAtom = atom('cat')

  const DisplayAtoms = () => {
    const [pet] = useAtom(petAtom, scope)
    return <p>{pet}</p>
  }

  const UpdateSnapshot = () => {
    const snapshot = useAtomsSnapshot(scope)
    const goToSnapshot = useGotoAtomsSnapshot(scope)
    return (
      <button
        onClick={() => {
          const newSnapshot = new Map(snapshot)
          newSnapshot.set(petAtom, 'dog')
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
  fireEvent.click(getByText('click'))
  await findByText('dog')
})
