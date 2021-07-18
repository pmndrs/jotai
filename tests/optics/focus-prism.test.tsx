import { FC } from 'react'
import * as rtl from '@testing-library/react'
import * as O from 'optics-ts'
import { atom, useAtom } from 'jotai'
import { focusAtom } from '../../src/optics'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('updates prisms', async () => {
  const bigAtom = atom<{ a?: number }>({ a: 5 })
  const focusFunction = (optic: O.OpticFor<{ a?: number }>) =>
    optic.prop('a').optional()

  const Counter: FC = () => {
    const [count, setCount] = useAtom(focusAtom(bigAtom, focusFunction))
    const [bigAtomValue] = useAtom(bigAtom)
    return (
      <>
        <div>bigAtom: {JSON.stringify(bigAtomValue)}</div>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = rtl.render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 5')
  await findByText('bigAtom: {"a":5}')

  rtl.fireEvent.click(getByText('button'))
  await findByText('count: 6')
  await findByText('bigAtom: {"a":6}')
})

it('atoms that focus on no values are not updated', async () => {
  const bigAtom = atom<{ a?: number }>({})
  const focusFunction = (optic: O.OpticFor<{ a?: number }>) =>
    optic.prop('a').optional()

  const Counter: FC = () => {
    const [count, setCount] = useAtom(focusAtom(bigAtom, focusFunction))
    const [bigAtomValue] = useAtom(bigAtom)
    return (
      <>
        <div>bigAtom: {JSON.stringify(bigAtomValue)}</div>
        <div>count: {JSON.stringify(count)}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = rtl.render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count:')
  await findByText('bigAtom: {}')

  rtl.fireEvent.click(getByText('button'))
  await findByText('count:')
  await findByText('bigAtom: {}')
})
