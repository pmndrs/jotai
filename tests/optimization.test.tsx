import React, { useRef } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom } from '../src/index'

it('only relevant render function called (#156)', async () => {
  // check out https://codesandbox.io/s/setatom-bail-failure-forked-m82r5?file=/src/App.tsx to see the expected re-renders
  const countAtom = atom(0)
  const unrelatedAtom = atom(0)

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    useAtom(unrelatedAtom)
    const commits = useRef(0)
    ++commits.current

    return (
      <>
        <div>
          <p>commits: {commits.current}</p>
          <p>count: {count}</p>
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(<Counter />)

  await waitFor(() => {
    getByText('count: 0')
    getByText('commits: 1')
  })
  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 1')
    getByText('commits: 2')
  })
  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 2')
    getByText('commits: 3')
  })
})
