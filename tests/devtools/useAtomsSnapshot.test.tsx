import { useState } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { Provider, atom, useAtom } from 'jotai'
import { useAtomsSnapshot } from 'jotai/devtools'

it('[DEV-ONLY] should register newly added atoms', async () => {
  __DEV__ = true
  const countAtom = atom(1)
  const petAtom = atom('cat')

  const DisplayCount = () => {
    const [clicked, setClicked] = useState(false)
    const [count] = useAtom(countAtom)

    return (
      <>
        <p>count: {count}</p>
        <button onClick={() => setClicked(true)}>click</button>
        {clicked && <DisplayPet />}
      </>
    )
  }

  const DisplayPet = () => {
    const [pet] = useAtom(petAtom)
    return <p>pet: {pet}</p>
  }

  const RegisteredAtomsCount = () => {
    const atoms = useAtomsSnapshot().values

    return <p>atom count: {atoms.size}</p>
  }

  const { findByText, getByText } = render(
    <Provider>
      <DisplayCount />
      <RegisteredAtomsCount />
    </Provider>
  )

  await findByText('atom count: 1')
  fireEvent.click(getByText('click'))
  await findByText('atom count: 2')
})

it('[DEV-ONLY] should let you access atoms and their state', async () => {
  __DEV__ = true
  const countAtom = atom(1)
  countAtom.debugLabel = 'countAtom'
  const petAtom = atom('cat')
  petAtom.debugLabel = 'petAtom'

  const Displayer = () => {
    useAtom(countAtom)
    useAtom(petAtom)
    return null
  }

  const SimpleDevtools = () => {
    const atoms = useAtomsSnapshot().values

    return (
      <div>
        {Array.from(atoms).map(([atom, atomValue]) => (
          <p key={atom.debugLabel}>{`${atom.debugLabel}: ${atomValue}`}</p>
        ))}
      </div>
    )
  }

  const { findByText } = render(
    <Provider>
      <Displayer />
      <SimpleDevtools />
    </Provider>
  )

  await findByText('countAtom: 1')
  await findByText('petAtom: cat')
})

it('[DEV-ONLY] should contain initial values', async () => {
  __DEV__ = true
  const countAtom = atom(1)
  countAtom.debugLabel = 'countAtom'
  const petAtom = atom('cat')
  petAtom.debugLabel = 'petAtom'

  const Displayer = () => {
    useAtom(countAtom)
    useAtom(petAtom)
    return null
  }

  const SimpleDevtools = () => {
    const atoms = useAtomsSnapshot().values

    return (
      <div>
        {Array.from(atoms).map(([atom, atomValue]) => (
          <p key={atom.debugLabel}>{`${atom.debugLabel}: ${atomValue}`}</p>
        ))}
      </div>
    )
  }

  const { findByText } = render(
    <Provider
      initialValues={[
        [countAtom, 42],
        [petAtom, 'dog'],
      ]}>
      <Displayer />
      <SimpleDevtools />
    </Provider>
  )

  await findByText('countAtom: 42')
  await findByText('petAtom: dog')
})

it('[DEV-ONLY] conditional dependencies + updating state should call devtools.send', async () => {
  __DEV__ = true
  const countAtom = atom(0)
  countAtom.debugLabel = 'countAtom'
  const secondCountAtom = atom(0)
  secondCountAtom.debugLabel = 'secondCountAtom'
  const enabledAtom = atom(true)
  enabledAtom.debugLabel = 'enabledAtom'
  const anAtom = atom((get) =>
    get(enabledAtom) ? get(countAtom) : get(secondCountAtom)
  )
  anAtom.debugLabel = 'anAtom'
  const App = () => {
    const [enabled, setEnabled] = useAtom(enabledAtom)
    const [cond] = useAtom(anAtom)

    return (
      <div className="App">
        <h1>enabled: {enabled ? 'true' : 'false'}</h1>
        <h1>condition: {cond}</h1>
        <button onClick={() => setEnabled(!enabled)}>change</button>
      </div>
    )
  }

  const SimpleDevtools = () => {
    const { dependents } = useAtomsSnapshot()

    const obj: Record<string, string[]> = {}

    for (const [atom, dependentAtoms] of dependents) {
      obj[`${atom}`] = [...dependentAtoms].map((_atom) => `${_atom}`)
    }

    return <div>{JSON.stringify(obj)}</div>
  }

  const { getByText } = render(
    <Provider>
      <App />
      <SimpleDevtools />
    </Provider>
  )

  await waitFor(() => {
    getByText('enabled: true')
    getByText('condition: 0')
    getByText(
      JSON.stringify({
        [`${enabledAtom}`]: [`${enabledAtom}`, `${anAtom}`],
        [`${anAtom}`]: [],
        [`${countAtom}`]: [`${anAtom}`, `${countAtom}`],
      })
    )
  })
  fireEvent.click(getByText('change'))
  await waitFor(() => {
    getByText('enabled: false')
    getByText('condition: 0')
    getByText(
      JSON.stringify({
        [`${enabledAtom}`]: [`${enabledAtom}`, `${anAtom}`],
        [`${anAtom}`]: [],
        [`${secondCountAtom}`]: [`${anAtom}`, `${secondCountAtom}`],
      })
    )
  })

  fireEvent.click(getByText('change'))
  await waitFor(() => {
    getByText('enabled: true')
    getByText('condition: 0')
    getByText(
      JSON.stringify({
        [`${enabledAtom}`]: [`${enabledAtom}`, `${anAtom}`],
        [`${anAtom}`]: [],
        [`${countAtom}`]: [`${anAtom}`, `${countAtom}`],
      })
    )
  })
})
