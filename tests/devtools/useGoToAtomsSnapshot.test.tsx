import { StrictMode, Suspense, useEffect, useRef } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { Provider, atom, useAtom } from 'jotai'
import type { Atom } from 'jotai'
import { useAtomsSnapshot, useGotoAtomsSnapshot } from 'jotai/devtools'

it('[DEV-ONLY] useGotoAtomsSnapshot should modify atoms snapshot', async () => {
  __DEV__ = true
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
          const newSnapshot = { ...snapshot, values: new Map(snapshot.values) }
          newSnapshot.values.set(petAtom, 'dog')
          newSnapshot.values.set(colorAtom, 'green')
          goToSnapshot(newSnapshot.values) // `values` for testing backward compatibility
        }}>
        click
      </button>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Provider>
        <DisplayAtoms />
        <UpdateSnapshot />
      </Provider>
    </StrictMode>
  )

  await findByText('cat')
  await findByText('blue')

  fireEvent.click(getByText('click'))
  await findByText('dog')
  await findByText('green')
})

it('[DEV-ONLY] useGotoAtomsSnapshot should work with derived atoms', async () => {
  __DEV__ = true
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
          const newSnapshot = { ...snapshot, values: new Map(snapshot.values) }
          newSnapshot.values.set(priceAtom, 20)
          goToSnapshot(newSnapshot)
        }}>
        click
      </button>
    )
  }

  const { getByText } = render(
    <StrictMode>
      <Provider>
        <DisplayPrice />
        <UpdateSnapshot />
      </Provider>
    </StrictMode>
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

it('[DEV-ONLY] useGotoAtomsSnapshot should work with async derived atoms', async () => {
  __DEV__ = true
  const priceAtom = atom(10)
  let resolve = () => {}
  const taxAtom = atom(async (get) => {
    await new Promise<void>((r) => (resolve = r))
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
          const newSnapshot = { ...snapshot, values: new Map(snapshot.values) }
          newSnapshot.values.set(priceAtom, 20)
          goToSnapshot(newSnapshot)
        }}>
        click
      </button>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <DisplayPrice />
          <UpdateSnapshot />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  resolve()
  await waitFor(() => {
    getByText('price: 10')
    getByText('tax: 2')
  })

  fireEvent.click(getByText('click'))
  await findByText('loading')
  resolve()
  await waitFor(() => {
    getByText('price: 20')
    getByText('tax: 4')
  })
})

it('[DEV-ONLY] useGotoAtomsSnapshot should work with original snapshot', async () => {
  __DEV__ = true
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
      if (snapshot.values.size && !snapshotRef.current) {
        // save first snapshot
        snapshotRef.current = snapshot.values
      }
    })
    const goToSnapshot = useGotoAtomsSnapshot()
    return (
      <button
        onClick={() => {
          if (!snapshotRef.current) {
            throw new Error('snapshot is not ready yet')
          }
          const newSnapshot = {
            ...snapshot,
            values: new Map(snapshotRef.current),
          }
          goToSnapshot(newSnapshot)
        }}>
        snapshot
      </button>
    )
  }

  const { getByText } = render(
    <StrictMode>
      <Provider>
        <DisplayPrice />
        <UpdateSnapshot />
      </Provider>
    </StrictMode>
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

it('[DEV-ONLY] useGotoAtomsSnapshot should respect atom scope', async () => {
  __DEV__ = true
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
          const newSnapshot = { ...snapshot, values: new Map(snapshot.values) }
          newSnapshot.values.set(petAtom, 'dog')
          goToSnapshot(newSnapshot)
        }}>
        click
      </button>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Provider>
        <DisplayAtoms />
        <UpdateSnapshot />
      </Provider>
    </StrictMode>
  )

  await findByText('cat')

  fireEvent.click(getByText('click'))
  await findByText('dog')
})
