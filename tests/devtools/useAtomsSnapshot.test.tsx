import { useState } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom, useAtom } from 'jotai'
import { useAtomsSnapshot } from 'jotai/devtools'

it('[DEV-ONLY] should register newly added atoms', async () => {
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
    const atoms = useAtomsSnapshot()

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
    const atoms = useAtomsSnapshot()

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
    const atoms = useAtomsSnapshot()

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
