import { Suspense, useEffect, useTransition } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { getTestProvider } from './testUtils'

const Provider = getTestProvider()

const describeWithUseTransition =
  typeof useTransition === 'function' ? describe : describe.skip

describeWithUseTransition('useTransition', () => {
  it('no extra commit with useTransition (#1125)', async () => {
    const countAtom = atom(0)
    const delayedAtom = atom(async (get) => {
      await new Promise((r) => setTimeout(r, 100))
      return get(countAtom)
    })

    const commited: { pending: boolean; delayed: number }[] = []

    const Counter = () => {
      const setCount = useSetAtom(countAtom)
      const delayed = useAtomValue(delayedAtom)
      const [pending, startTransition] = useTransition()
      useEffect(() => {
        commited.push({ pending, delayed })
      })
      return (
        <>
          <div>delayed: {delayed}</div>
          <button onClick={() => startTransition(() => setCount((c) => c + 1))}>
            button
          </button>
        </>
      )
    }

    const { getByText, findByText } = render(
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    )

    await findByText('delayed: 0')

    fireEvent.click(getByText('button'))
    await findByText('delayed: 1')

    expect(commited).toEqual([
      { pending: false, delayed: 0 },
      { pending: true, delayed: 0 },
      { pending: false, delayed: 1 },
    ])
  })
})
