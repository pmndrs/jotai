import { FC, useState } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { useAtomsSnapshot } from '../../src/devtools'
import { Provider, atom, useAtom } from '../../src/index'

it('should register newly added atoms', async () => {
  const countAtom = atom(1)
  const petAtom = atom('cat')

  const DisplayCount: FC = () => {
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

  const DisplayPet: FC = () => {
    const [pet] = useAtom(petAtom)
    return <p>pet: {pet}</p>
  }

  const RegisteredAtomsCount: FC = () => {
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

  const Displayer: FC = () => {
    useAtom(countAtom)
    useAtom(petAtom)
    return null
  }

  const SimpleDevtools: FC = () => {
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

it('should contain initial values', async () => {
  const countAtom = atom(1)
  countAtom.debugLabel = 'countAtom'
  const petAtom = atom('cat')
  petAtom.debugLabel = 'petAtom'

  const Displayer: FC = () => {
    useAtom(countAtom)
    useAtom(petAtom)
    return null
  }

  const SimpleDevtools: FC = () => {
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
