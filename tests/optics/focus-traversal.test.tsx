import React, { Fragment } from 'react'
import { Provider as ProviderOrig, atom, useAtom } from 'jotai'
import * as rtl from '@testing-library/react'
import { focusAtom } from '../../src/optics/focusAtom'

const Provider = process.env.PROVIDER_LESS_MODE ? Fragment : ProviderOrig

it('updates traversals', async () => {
  const bigAtom = atom<{ a?: number }[]>([{ a: 5 }, {}, { a: 6 }])
  const aAtom = focusAtom(bigAtom, (optic) =>
    optic.elems().prop('a').optional()
  )

  const Counter: React.FC = () => {
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
