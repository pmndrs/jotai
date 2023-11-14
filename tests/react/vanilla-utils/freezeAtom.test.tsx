import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import { it } from 'vitest'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import { freezeAtom, freezeAtomCreator } from 'jotai/vanilla/utils'

it('freezeAtom basic test', async () => {
  const objAtom = atom({ count: 0 })

  const Component = () => {
    const [obj] = useAtom(freezeAtom(objAtom))

    return <div>isFrozen: {`${Object.isFrozen(obj)}`}</div>
  }

  const { findByText } = render(
    <StrictMode>
      <Component />
    </StrictMode>,
  )

  await findByText('isFrozen: true')
})

it('freezeAtomCreator basic test', async () => {
  const createFrozenAtom = freezeAtomCreator(atom)
  const objAtom = createFrozenAtom({ count: 0 })

  const Component = () => {
    const [obj] = useAtom(objAtom)

    return <div>isFrozen: {`${Object.isFrozen(obj)}`}</div>
  }

  const { findByText } = render(
    <StrictMode>
      <Component />
    </StrictMode>,
  )

  await findByText('isFrozen: true')
})
