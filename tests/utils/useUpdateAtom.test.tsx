import React, { StrictMode, useEffect, useRef } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom, useAtom, WritableAtom } from '../../src/index'
import { useUpdateAtom } from '../../src/utils'

const useRerenderCount = () => {
  const rerenderCountRef = useRef(0)
  useEffect(() => {
    rerenderCountRef.current += 1
  })
  return rerenderCountRef.current
}

it('useUpdateAtom does not trigger rerender in component', async () => {
  const countAtom = atom(0)

  const Displayer: React.FC = () => {
    const [count] = useAtom(countAtom)
    const rerenders = useRerenderCount()
    return (
      <div>
        count: {count}, rerenders: {rerenders}
      </div>
    )
  }

  const Updater: React.FC = () => {
    const setCount = useUpdateAtom(countAtom)
    const rerenders = useRerenderCount()
    return (
      <>
        <button onClick={() => setCount((value) => value + 1)}>
          increment
        </button>
        <div>updater rerenders: {rerenders}</div>
      </>
    )
  }

  const Parent: React.FC = () => {
    return (
      <>
        <Displayer />
        <Updater />
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Parent />
    </Provider>
  )

  await findByText('count: 0, rerenders: 0')
  await findByText('updater rerenders: 0')

  fireEvent.click(getByText('increment'))
  await findByText('count: 1, rerenders: 1')
  await findByText('updater rerenders: 0')

  fireEvent.click(getByText('increment'))
  await findByText('count: 2, rerenders: 2')
  await findByText('updater rerenders: 0')

  fireEvent.click(getByText('increment'))
  await findByText('count: 3, rerenders: 3')
  await findByText('updater rerenders: 0')
})
