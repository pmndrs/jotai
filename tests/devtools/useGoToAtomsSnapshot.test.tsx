import { FC, Suspense, useEffect, useRef } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { useAtomsSnapshot, useGotoAtomsSnapshot } from '../../src/devtools'
import { Provider, atom, useAtom } from '../../src/index'
import type { Atom } from '../../src/index'

it('useGotoAtomsSnapshot should modify atoms snapshot', async () => {
  const petAtom = atom('cat')
  const colorAtom = atom('blue')

  const DisplayAtoms: FC = () => {
    const [pet] = useAtom(petAtom)
    const [color] = useAtom(colorAtom)
    return (
      <>
        <p>{pet}</p>
        <p>{color}</p>
      </>
    )
  }

  const UpdateSnapshot: FC = () => {
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

  const DisplayPrice: FC = () => {
    const [price] = useAtom(priceAtom)
    const [tax] = useAtom(taxAtom)
    return (
      <>
        <p>price: {price}</p>
        <p>tax: {tax}</p>
      </>
    )
  }

  const UpdateSnapshot: FC = () => {
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

  const DisplayPrice: FC = () => {
    const [price] = useAtom(priceAtom)
    const [tax] = useAtom(taxAtom)
    return (
      <>
        <p>price: {price}</p>
        <p>tax: {tax}</p>
      </>
    )
  }

  const UpdateSnapshot: FC = () => {
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

  const DisplayPrice: FC = () => {
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

  const UpdateSnapshot: FC = () => {
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
  petAtom.scope = scope

  const DisplayAtoms: FC = () => {
    const [pet] = useAtom(petAtom)
    return <p>{pet}</p>
  }

  const UpdateSnapshot: FC = () => {
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

it('useGotoAtomsSnapshot should error on scope mismatch', async () => {
  const petScope = Symbol()
  const colorScope = Symbol()
  const petAtom = atom('cat')
  petAtom.scope = petScope
  const colorAtom = atom('blue')
  colorAtom.scope = colorScope

  const DisplayAtoms: FC = () => {
    const [pet] = useAtom(petAtom)
    const [color] = useAtom(colorAtom)
    return (
      <>
        <p>{pet}</p>
        <p>{color}</p>
      </>
    )
  }

  const UpdateSnapshot: FC = () => {
    const snapshot = useAtomsSnapshot()
    const goToSnapshot = useGotoAtomsSnapshot()
    return (
      <button
        onClick={() => {
          const newSnapshot = new Map(snapshot)
          newSnapshot.set(petAtom, 'dog')
          newSnapshot.set(colorAtom, 'green')
          try {
            goToSnapshot(newSnapshot)
          } catch (e) {
            expect(e.message).toBe('atom scope mismatch to restore')
          }
        }}>
        click
      </button>
    )
  }

  const { findByText, getByText } = render(
    <Provider scope={colorScope}>
      <DisplayAtoms />
      <UpdateSnapshot />
    </Provider>
  )

  await findByText('cat')
  await findByText('blue')
  fireEvent.click(getByText('click'))
})
