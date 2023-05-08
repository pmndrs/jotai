import { StrictMode } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { it } from 'vitest'
import { atom, useAtom } from 'jotai'
import { HydrateAtoms } from 'jotai/react/utils'

it('HydrateAtoms should only hydrate on first render', async () => {
  const countAtom = atom(0)
  const Counter = ({
    initialCount,
  }: {
    initialCount: number
    initialStatus: string
  }) => {
    const [countValue, setCount] = useAtom(countAtom)

    return (
      <HydrateAtoms values={[[countAtom, initialCount]]}>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
      </HydrateAtoms>
    )
  }
  const { findByText, getByText, rerender } = render(
    <StrictMode>
      <Counter initialCount={42} initialStatus="rejected" />
    </StrictMode>
  )

  await findByText('count: 42')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')

  rerender(
    <StrictMode>
      <Counter initialCount={65} initialStatus="rejected" />
    </StrictMode>
  )
  await findByText('count: 43')
})
