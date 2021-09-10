import { render } from '@testing-library/react'
import { atom, useAtom } from '../../src/index'
import { freezeAtom, freezeAtomCreator } from '../../src/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('freezeAtom basic test', async () => {
  const objAtom = atom({ count: 0 })

  const Component = () => {
    const [obj] = useAtom(freezeAtom(objAtom))

    return <div>isFrozen: {`${Object.isFrozen(obj)}`}</div>
  }

  const { findByText } = render(
    <Provider>
      <Component />
    </Provider>
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
    <Provider>
      <Component />
    </Provider>
  )

  await findByText('isFrozen: true')
})
