import React, { useRef } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom } from '../src/index'

it('useless re-renders with static atoms', async () => {
  // check out https://codesandbox.io/s/setatom-bail-failure-forked-m82r5?file=/src/App.tsx to see the expected re-renders
  const countAtom = atom(0)
  const unrelatedAtom = atom(0)

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    useAtom(unrelatedAtom)
    const renderCount = useRef(0)
    ++renderCount.current

    return (
      <>
        <div>
          <p>
            count: {count} ({renderCount.current})
          </p>
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(<Counter />)

  await findByText('count: 0 (1)')
  fireEvent.click(getByText('button'))
  await findByText('count: 1 (2)')
  fireEvent.click(getByText('button'))
  await findByText('count: 2 (3)')
})
