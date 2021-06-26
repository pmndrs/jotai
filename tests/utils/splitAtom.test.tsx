import React, { useEffect, useRef } from 'react'

import { atom, useAtom } from 'jotai'
import type { Atom, PrimitiveAtom } from 'jotai'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { getTestProvider } from '../testUtils'
import { splitAtom } from '../../src/utils'

const Provider = getTestProvider()

const consoleWarn = console.warn
beforeEach(() => {
  console.warn = jest.fn()
})
afterEach(() => {
  console.warn = consoleWarn
})

type TodoItem = { task: string; checked?: boolean }

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  return commitCountRef.current
}

it('no unneccesary updates when updating atoms', async () => {
  const todosAtom = atom<TodoItem[]>([
    { task: 'get cat food', checked: false },
    { task: 'get dragon food', checked: false },
  ])

  const TaskList: React.FC<{ listAtom: typeof todosAtom }> = ({ listAtom }) => {
    const [atoms, remove] = useAtom(splitAtom(listAtom))
    return (
      <>
        TaskListUpdates: {useCommitCount()}
        {atoms.map((anAtom, index) => (
          <TaskItem
            key={index}
            onRemove={() => remove(anAtom)}
            itemAtom={anAtom}
          />
        ))}
      </>
    )
  }

  const TaskItem: React.FC<{
    itemAtom: PrimitiveAtom<TodoItem>
    onRemove: () => void
  }> = ({ itemAtom }) => {
    const [value, onChange] = useAtom(itemAtom)
    const toggle = () =>
      onChange((value) => ({ ...value, checked: !value.checked }))
    return (
      <li>
        {value.task} commits: {useCommitCount()}
        <input
          data-testid={`${value.task}-checkbox`}
          type="checkbox"
          checked={value.checked || false}
          onChange={toggle}
        />
      </li>
    )
  }

  const { getByTestId, getByText } = render(
    <Provider>
      <TaskList listAtom={todosAtom} />
    </Provider>
  )

  await waitFor(() => {
    getByText('get cat food commits: 1')
    getByText('get dragon food commits: 1')
    getByText('TaskListUpdates: 1')
  })

  const catBox = getByTestId('get cat food-checkbox') as HTMLInputElement
  const dragonBox = getByTestId('get dragon food-checkbox') as HTMLInputElement

  expect(catBox.checked).toBe(false)
  expect(dragonBox.checked).toBe(false)

  fireEvent.click(catBox)

  await waitFor(() => {
    getByText('get cat food commits: 2')
    getByText('get dragon food commits: 1')
    getByText('TaskListUpdates: 1')
  })

  expect(catBox.checked).toBe(true)
  expect(dragonBox.checked).toBe(false)

  fireEvent.click(dragonBox)

  await waitFor(() => {
    getByText('get cat food commits: 2')
    getByText('get dragon food commits: 2')
    getByText('TaskListUpdates: 1')
  })

  expect(catBox.checked).toBe(true)
  expect(dragonBox.checked).toBe(true)
})

it('removing atoms', async () => {
  const todosAtom = atom<TodoItem[]>([
    { task: 'get cat food', checked: false },
    { task: 'get dragon food', checked: false },
    { task: 'help nana', checked: false },
  ])

  const TaskList: React.FC<{ listAtom: typeof todosAtom }> = ({ listAtom }) => {
    const [atoms, remove] = useAtom(splitAtom(listAtom))
    return (
      <>
        {atoms.map((anAtom, index) => (
          <TaskItem
            key={index}
            onRemove={() => remove(anAtom)}
            itemAtom={anAtom}
          />
        ))}
      </>
    )
  }

  const TaskItem: React.FC<{
    itemAtom: PrimitiveAtom<TodoItem>
    onRemove: () => void
  }> = ({ itemAtom, onRemove }) => {
    const [value] = useAtom(itemAtom)
    return (
      <li>
        <div>{value.task}</div>
        <button data-testid={`${value.task}-removebutton`} onClick={onRemove}>
          X
        </button>
      </li>
    )
  }

  const { getByTestId, queryByText } = render(
    <Provider>
      <TaskList listAtom={todosAtom} />
    </Provider>
  )

  await waitFor(() => {
    expect(queryByText('get cat food')).toBeTruthy()
    expect(queryByText('get dragon food')).toBeTruthy()
    expect(queryByText('help nana')).toBeTruthy()
  })

  fireEvent.click(getByTestId('get cat food-removebutton'))

  await waitFor(() => {
    expect(queryByText('get cat food')).toBeFalsy()
    expect(queryByText('get dragon food')).toBeTruthy()
    expect(queryByText('help nana')).toBeTruthy()
  })

  fireEvent.click(getByTestId('get dragon food-removebutton'))

  await waitFor(() => {
    expect(queryByText('get cat food')).toBeFalsy()
    expect(queryByText('get dragon food')).toBeFalsy()
    expect(queryByText('help nana')).toBeTruthy()
  })

  fireEvent.click(getByTestId('help nana-removebutton'))

  await waitFor(() => {
    expect(queryByText('get cat food')).toBeFalsy()
    expect(queryByText('get dragon food')).toBeFalsy()
    expect(queryByText('help nana')).toBeFalsy()
  })
})

it('read-only array atom', async () => {
  const todosAtom = atom<TodoItem[]>(() => [
    { task: 'get cat food', checked: false },
    { task: 'get dragon food', checked: false },
  ])

  const TaskList: React.FC<{ listAtom: typeof todosAtom }> = ({ listAtom }) => {
    const [atoms] = useAtom(splitAtom(listAtom))
    return (
      <>
        {atoms.map((anAtom, index) => (
          <TaskItem key={index} itemAtom={anAtom} />
        ))}
      </>
    )
  }

  const TaskItem: React.FC<{ itemAtom: Atom<TodoItem> }> = ({ itemAtom }) => {
    const [value] = useAtom(itemAtom)
    return (
      <li>
        <input
          data-testid={`${value.task}-checkbox`}
          type="checkbox"
          checked={value.checked || false}
          readOnly
        />
      </li>
    )
  }

  const { getByTestId } = render(
    <Provider>
      <TaskList listAtom={todosAtom} />
    </Provider>
  )

  const catBox = getByTestId('get cat food-checkbox') as HTMLInputElement
  const dragonBox = getByTestId('get dragon food-checkbox') as HTMLInputElement

  // FIXME is there a better way?
  await waitFor(() => {})

  expect(catBox.checked).toBe(false)
  expect(dragonBox.checked).toBe(false)
})

it('handles scope', async () => {
  const scope = Symbol()
  const todosAtom = atom<TodoItem[]>([
    { task: 'get cat food', checked: false },
    { task: 'get dragon food', checked: false },
  ])
  todosAtom.scope = scope

  const TaskList: React.FC<{ listAtom: typeof todosAtom }> = ({ listAtom }) => {
    const [atoms] = useAtom(splitAtom(listAtom))
    return (
      <>
        {atoms.map((anAtom, index) => (
          <TaskItem key={index} itemAtom={anAtom} />
        ))}
      </>
    )
  }

  const TaskItem: React.FC<{
    itemAtom: PrimitiveAtom<TodoItem>
  }> = ({ itemAtom }) => {
    const [value, onChange] = useAtom(itemAtom)
    const toggle = () =>
      onChange((value) => ({ ...value, checked: !value.checked }))
    return (
      <li>
        <input
          data-testid={`${value.task}-checkbox`}
          type="checkbox"
          checked={value.checked ?? false}
          onChange={toggle}
        />
      </li>
    )
  }

  const { getByTestId } = render(
    <Provider scope={scope}>
      <TaskList listAtom={todosAtom} />
    </Provider>
  )

  const catBox = getByTestId('get cat food-checkbox') as HTMLInputElement
  const dragonBox = getByTestId('get dragon food-checkbox') as HTMLInputElement

  expect(catBox.checked).toBe(false)
  expect(dragonBox.checked).toBe(false)

  fireEvent.click(catBox)

  // FIXME is there a better way?
  await waitFor(() => {})

  expect(catBox.checked).toBe(true)
  expect(dragonBox.checked).toBe(false)
})

it('no error on wrong atom configs (fix 510)', async () => {
  const filterAtom = atom('all')
  const numsAtom = atom<number[]>([0, 1])
  const filteredAtom = atom<number[]>((get) => {
    const filter = get(filterAtom)
    const nums = get(numsAtom)
    if (filter === 'even') return nums.filter((num) => num % 2 === 0)
    else return nums
  })
  const filteredAtomsAtom = splitAtom(filteredAtom, (num) => num)

  function useCachedAtoms<T>(atoms: T[]) {
    const prevAtoms = React.useRef<T[]>(atoms)
    return prevAtoms.current
  }

  type NumItemProps = {
    atom: Atom<number>
  }

  const NumItem: React.FC<NumItemProps> = ({ atom }) => {
    const [readOnlyItem] = useAtom(atom)
    return <>{readOnlyItem}</>
  }

  function Filter() {
    const [filter, set] = useAtom(filterAtom)

    const handlechange = (e: React.ChangeEvent<HTMLInputElement>) => {
      set(e.target.value)
    }

    return (
      <div>
        <input
          type="radio"
          value="all"
          checked={filter === 'all'}
          onChange={handlechange}
        />{' '}
        all
        <input
          type="radio"
          value="even"
          checked={filter === 'even'}
          data-testid={'even-checkbox'}
          onChange={handlechange}
        />{' '}
        even
      </div>
    )
  }

  const Filtered: React.FC = () => {
    const [todos] = useAtom(filteredAtomsAtom)
    const cachedAtoms = useCachedAtoms(todos)

    return (
      <>
        {cachedAtoms.map((atom) => (
          <NumItem key={atom.toString()} atom={atom} />
        ))}
      </>
    )
  }

  const { getByTestId } = render(
    <Provider>
      <Filter />
      <div data-testid={`numbers`}>
        <Filtered />
      </div>
    </Provider>
  )

  const numbersEl = getByTestId('numbers')
  const evenCheckboxEl = getByTestId('even-checkbox')

  expect(numbersEl.textContent).toBe('01')

  fireEvent.click(evenCheckboxEl)

  expect(numbersEl.textContent).toBe('0')
  expect(console.warn).toHaveBeenCalledTimes(1)
})
