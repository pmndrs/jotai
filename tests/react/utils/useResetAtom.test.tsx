import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { it } from 'vitest'
import { useAtom } from 'jotai/react'
import { useResetAtom } from 'jotai/react/utils'
import { atom } from 'jotai/vanilla'
import { RESET, atomWithReducer, atomWithReset } from 'jotai/vanilla/utils'

it('atomWithReset resets to its first value', async () => {
  const countAtom = atomWithReset(0)

  const Parent = () => {
    const [count, setValue] = useAtom(countAtom)
    const resetAtom = useResetAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={resetAtom}>reset</button>
        <button onClick={() => setValue((oldValue) => oldValue + 1)}>
          increment
        </button>
        <button onClick={() => setValue(10)}>set to 10</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await screen.findByText('count: 0')

  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('count: 1')
  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('count: 2')
  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('count: 3')

  await userEvent.click(screen.getByText('reset'))
  await screen.findByText('count: 0')

  await userEvent.click(screen.getByText('set to 10'))
  await screen.findByText('count: 10')

  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('count: 11')
  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('count: 12')
  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('count: 13')
})

it('atomWithReset reset based on previous value', async () => {
  const countAtom = atomWithReset(0)

  const Parent = () => {
    const [count, setValue] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button
          onClick={() =>
            setValue((oldValue) =>
              oldValue === 3 ? (RESET as never) : oldValue + 1,
            )
          }
        >
          increment till 3, then reset
        </button>
      </>
    )
  }

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await screen.findByText('count: 0')

  await userEvent.click(screen.getByText('increment till 3, then reset'))
  await screen.findByText('count: 1')
  await userEvent.click(screen.getByText('increment till 3, then reset'))
  await screen.findByText('count: 2')
  await userEvent.click(screen.getByText('increment till 3, then reset'))
  await screen.findByText('count: 3')

  await userEvent.click(screen.getByText('increment till 3, then reset'))
  await screen.findByText('count: 0')
})

it('atomWithReset through read-write atom', async () => {
  const primitiveAtom = atomWithReset(0)
  const countAtom = atom(
    (get) => get(primitiveAtom),
    (_get, set, newValue: number | typeof RESET) =>
      set(primitiveAtom, newValue as never),
  )

  const Parent = () => {
    const [count, setValue] = useAtom(countAtom)
    const resetAtom = useResetAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={resetAtom}>reset</button>
        <button onClick={() => setValue(10)}>set to 10</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await screen.findByText('count: 0')

  await userEvent.click(screen.getByText('set to 10'))
  await screen.findByText('count: 10')

  await userEvent.click(screen.getByText('reset'))
  await screen.findByText('count: 0')
})

it('useResetAtom with custom atom', async () => {
  const reducer = (state: number, action: 'INCREASE' | typeof RESET) => {
    switch (action) {
      case 'INCREASE':
        return state + 1
      case RESET:
        return 0
      default:
        throw new Error('unknown action')
    }
  }

  const countAtom = atomWithReducer(0, reducer)

  const Parent = () => {
    const [count, dispatch] = useAtom(countAtom)
    const resetAtom = useResetAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={resetAtom}>reset</button>
        <button onClick={() => dispatch('INCREASE')}>increment</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await screen.findByText('count: 0')

  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('count: 1')
  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('count: 2')
  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('count: 3')

  await userEvent.click(screen.getByText('reset'))
  await screen.findByText('count: 0')
})
