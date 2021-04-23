import React, { useState } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../../src/index'
import { useAtomsSnapshot } from '../../src/devtools'

beforeEach(() => {
  process.env.NODE_ENV = 'development'
})

afterEach(() => {
  process.env.NODE_ENV = 'test'
})

it('should register newly added atoms', async () => {
  const countAtom = atom(1)
  const petAtom = atom('cat')

  const DisplayCount: React.FC = () => {
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

  const DisplayPet: React.FC = () => {
    const [pet] = useAtom(petAtom)
    return <p>pet: {pet}</p>
  }

  const RegisteredAtomsCount: React.FC = () => {
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

it('should let you access atoms and their state', async () => {
  const countAtom = atom(1)
  countAtom.debugLabel = 'countAtom'
  const petAtom = atom('cat')
  petAtom.debugLabel = 'petAtom'

  const Displayer: React.FC = () => {
    useAtom(countAtom)
    useAtom(petAtom)
    return null
  }

  const SimpleDevtools: React.FC = () => {
    const atoms = useAtomsSnapshot()

    return (
      <div>
        {Array.from(atoms).map(([atom, atomState]) => (
          <p key={atom.debugLabel}>{`${atom.debugLabel}: ${atomState}`}</p>
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
