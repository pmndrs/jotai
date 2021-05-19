import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../../src/index'
import { useAtomsSnapshot, useGoToAtomsSnapshot } from '../../src/devtools'

it('useGoToAtomsSnapshot should modify atoms snapshot', async () => {
  const petAtom = atom('cat')

  const DisplayPet: React.FC = () => {
    const [pet] = useAtom(petAtom)
    return <p>{pet}</p>
  }

  const UpdateSnapshot: React.FC = () => {
    const snapshot = useAtomsSnapshot()
    const goToSnapshot = useGoToAtomsSnapshot()
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
      <DisplayPet />
      <UpdateSnapshot />
    </Provider>
  )

  await findByText('cat')
  fireEvent.click(getByText('click'))
  await findByText('dog')
})
