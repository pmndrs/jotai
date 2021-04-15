import React, { useState } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../../src/index'
import { useAtomsSnapshot } from '../../src/devtools'

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
    const [atoms] = useAtomsSnapshot()

    return <p>atom count: {atoms.length}</p>
  }

  const { findByText, getByText } = render(
    <Provider>
      <DisplayCount />
      <RegisteredAtomsCount />
    </Provider>
  )

  await findByText('atom count: 1')
  fireEvent.click(getByText('button'))
  await findByText('atom count: 2')
})
