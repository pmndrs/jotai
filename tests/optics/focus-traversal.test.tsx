import { atom, Provider, useAtom } from 'jotai'
import React from 'react'
import * as rtl from '@testing-library/react'
import { useFocus } from '../../src/optics/useFocus'

it('updates traversals', async () => {
  const bigAtom = atom<{ a?: number }[]>([{ a: 5 }, {}, { a: 6 }])

  const Counter: React.FC = () => {
    const aAtom = useFocus(bigAtom, (optic) =>
      optic.elems().prop('a').optional()
    )
    const [count, setCount] = useAtom(aAtom)
    const [bigAtomValue] = useAtom(bigAtom)
    return (
      <>
        <div>bigAtom: {JSON.stringify(bigAtomValue)}</div>
        <div>count: {count.join(',')}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = rtl.render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 5,6')
  await findByText('bigAtom: [{"a":5},{},{"a":6}]')

  rtl.fireEvent.click(getByText('button'))
  await findByText('count: 6,7')
  await findByText('bigAtom: [{"a":6},{},{"a":7}]')
})
