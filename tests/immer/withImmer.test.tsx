import { fireEvent, render } from '@testing-library/react'
import { withImmer } from '../../src/immer'
import { atom, useAtom } from '../../src/index'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('withImmer derived atom with useAtom', async () => {
  const regularCountAtom = atom(0)

  const Parent = () => {
    const [count, setCount] = useAtom(withImmer(regularCountAtom))
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((draft) => (draft = draft + 1))}>
          Increase
        </button>
        <button onClick={() => setCount((draft) => (draft = draft - 1))}>
          Decrease
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Parent />
    </Provider>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('Increase'))
  await findByText('count: 1')

  fireEvent.click(getByText('Decrease'))
  await findByText('count: 0')
})

it('withImmer derived atom with useAtom + scope', async () => {
  const scope = Symbol()
  const regularCountAtom = atom(0)

  const Parent = () => {
    const [regularCount] = useAtom(regularCountAtom, scope)
    const [count, setCount] = useAtom(withImmer(regularCountAtom), scope)
    return (
      <>
        <div>
          count: {count} {regularCount}
        </div>
        <button onClick={() => setCount((draft) => (draft = draft + 1))}>
          Increase
        </button>
        <button onClick={() => setCount((draft) => (draft = draft - 1))}>
          Decrease
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider scope={scope}>
      <Parent />
    </Provider>
  )

  await findByText('count: 0 0')

  fireEvent.click(getByText('Increase'))
  await findByText('count: 1 1')

  fireEvent.click(getByText('Decrease'))
  await findByText('count: 0 0')
})

it('withImmer derived atom with WritableAtom<Value, Value> signature', async () => {
  const regularCountAtom = atom(0)

  const Parent = () => {
    const [count, setCount] = useAtom(withImmer(regularCountAtom))
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount(count + 1)}>Increase</button>
        <button onClick={() => setCount(count - 1)}>Decrease</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Parent />
    </Provider>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('Increase'))
  await findByText('count: 1')

  fireEvent.click(getByText('Decrease'))
  await findByText('count: 0')
})
