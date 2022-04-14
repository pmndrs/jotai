import { useEffect, useRef } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom, useSetAtom } from 'jotai'
import type { Atom, PrimitiveAtom } from 'jotai'
import { splitAtom } from 'jotai/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

type TodoItem = { task: string; checked?: boolean }

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  return commitCountRef.current
}

it('no unnecessary updates when updating atoms', async () => {
  const todosAtom = atom<TodoItem[]>([
    { task: 'get cat food', checked: false },
    { task: 'get dragon food', checked: false },
  ])

  const TaskList = ({ listAtom }: { listAtom: typeof todosAtom }) => {
    const [atoms, dispatch] = useAtom(splitAtom(listAtom))
    return (
      <>
        TaskListUpdates: {useCommitCount()}
        {atoms.map((anAtom, index) => (
          <TaskItem
            key={index}
            onRemove={() => dispatch({ type: 'remove', atom: anAtom })}
            itemAtom={anAtom}
          />
        ))}
      </>
    )
  }

  const TaskItem = ({
    itemAtom,
  }: {
    itemAtom: PrimitiveAtom<TodoItem>
    onRemove: () => void
  }) => {
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
    getByText('TaskListUpdates: 1')
    getByText('get cat food commits: 1')
    getByText('get dragon food commits: 1')
  })

  const catBox = getByTestId('get cat food-checkbox') as HTMLInputElement
  const dragonBox = getByTestId('get dragon food-checkbox') as HTMLInputElement

  expect(catBox.checked).toBe(false)
  expect(dragonBox.checked).toBe(false)

  fireEvent.click(catBox)

  await waitFor(() => {
    getByText('TaskListUpdates: 1')
    getByText('get cat food commits: 2')
    getByText('get dragon food commits: 1')
  })

  expect(catBox.checked).toBe(true)
  expect(dragonBox.checked).toBe(false)

  fireEvent.click(dragonBox)

  await waitFor(() => {
    getByText('TaskListUpdates: 1')
    getByText('get cat food commits: 2')
    getByText('get dragon food commits: 2')
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

  const TaskList = ({ listAtom }: { listAtom: typeof todosAtom }) => {
    const [atoms, dispatch] = useAtom(splitAtom(listAtom))
    return (
      <>
        {atoms.map((anAtom, index) => (
          <TaskItem
            key={index}
            onRemove={() => dispatch({ type: 'remove', atom: anAtom })}
            itemAtom={anAtom}
          />
        ))}
      </>
    )
  }

  const TaskItem = ({
    itemAtom,
    onRemove,
  }: {
    itemAtom: PrimitiveAtom<TodoItem>
    onRemove: () => void
  }) => {
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

it('inserting atoms', async () => {
  const todosAtom = atom<TodoItem[]>([
    { task: 'get cat food' },
    { task: 'get dragon food' },
    { task: 'help nana' },
  ])

  const TaskList = ({ listAtom }: { listAtom: typeof todosAtom }) => {
    const [atoms, dispatch] = useAtom(splitAtom(listAtom))
    return (
      <>
        <ul data-testid="list">
          {atoms.map((anAtom, index) => (
            <TaskItem
              key={index}
              onInsert={(newValue) =>
                dispatch({
                  type: 'insert',
                  value: newValue,
                  before: anAtom,
                })
              }
              itemAtom={anAtom}
            />
          ))}
        </ul>
        <button
          data-testid="addtaskbutton"
          onClick={() =>
            dispatch({
              type: 'insert',
              value: { task: 'end' },
            })
          }>
          add task
        </button>
      </>
    )
  }

  let taskCount = 1
  const TaskItem = ({
    itemAtom,
    onInsert,
  }: {
    itemAtom: PrimitiveAtom<TodoItem>
    onInsert: (newValue: TodoItem) => void
  }) => {
    const [value] = useAtom(itemAtom)
    return (
      <li>
        <div>{value.task}</div>
        <button
          data-testid={`${value.task}-insertbutton`}
          onClick={() => onInsert({ task: 'new task' + taskCount++ })}>
          +
        </button>
      </li>
    )
  }

  const { getByTestId, queryByTestId } = render(
    <Provider>
      <TaskList listAtom={todosAtom} />
    </Provider>
  )

  await waitFor(() => {
    expect(queryByTestId('list')?.textContent).toBe(
      'get cat food+get dragon food+help nana+'
    )
  })

  fireEvent.click(getByTestId('help nana-insertbutton'))
  await waitFor(() => {
    expect(queryByTestId('list')?.textContent).toBe(
      'get cat food+get dragon food+new task1+help nana+'
    )
  })

  fireEvent.click(getByTestId('get cat food-insertbutton'))
  await waitFor(() => {
    expect(queryByTestId('list')?.textContent).toBe(
      'new task2+get cat food+get dragon food+new task1+help nana+'
    )
  })

  fireEvent.click(getByTestId('addtaskbutton'))
  await waitFor(() => {
    expect(queryByTestId('list')?.textContent).toBe(
      'new task2+get cat food+get dragon food+new task1+help nana+end+'
    )
  })
})

it('read-only array atom', async () => {
  const todosAtom = atom<TodoItem[]>(() => [
    { task: 'get cat food', checked: false },
    { task: 'get dragon food', checked: false },
  ])

  const TaskList = ({ listAtom }: { listAtom: typeof todosAtom }) => {
    const [atoms] = useAtom(splitAtom(listAtom))
    return (
      <>
        {atoms.map((anAtom, index) => (
          <TaskItem key={index} itemAtom={anAtom} />
        ))}
      </>
    )
  }

  const TaskItem = ({ itemAtom }: { itemAtom: Atom<TodoItem> }) => {
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

  const TaskList = ({ listAtom }: { listAtom: typeof todosAtom }) => {
    const [atoms] = useAtom(splitAtom(listAtom), scope)
    return (
      <>
        {atoms.map((anAtom, index) => (
          <TaskItem key={index} itemAtom={anAtom} />
        ))}
      </>
    )
  }

  const TaskItem = ({ itemAtom }: { itemAtom: PrimitiveAtom<TodoItem> }) => {
    const [value, onChange] = useAtom(itemAtom, scope)
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

it('no error with cached atoms (fix 510)', async () => {
  const filterAtom = atom('all')
  const numsAtom = atom<number[]>([0, 1, 2, 3, 4])
  const filteredAtom = atom<number[]>((get) => {
    const filter = get(filterAtom)
    const nums = get(numsAtom)
    if (filter === 'even') {
      return nums.filter((num) => num % 2 === 0)
    }
    return nums
  })
  const filteredAtomsAtom = splitAtom(filteredAtom, (num) => num)

  function useCachedAtoms<T>(atoms: T[]) {
    const prevAtoms = useRef<T[]>(atoms)
    return prevAtoms.current
  }

  type NumItemProps = {
    atom: Atom<number>
  }

  const NumItem = ({ atom }: NumItemProps) => {
    const [readOnlyItem] = useAtom(atom)
    if (typeof readOnlyItem !== 'number') {
      throw new Error('expecting a number')
    }
    return <>{readOnlyItem}</>
  }

  function Filter() {
    const [, setFilter] = useAtom(filterAtom)
    return <button onClick={() => setFilter('even')}>button</button>
  }

  const Filtered = () => {
    const [todos] = useAtom(filteredAtomsAtom)
    const cachedAtoms = useCachedAtoms(todos)

    return (
      <>
        {cachedAtoms.map((atom) => (
          <NumItem key={`${atom}`} atom={atom} />
        ))}
      </>
    )
  }

  const { getByText } = render(
    <Provider>
      <Filter />
      <Filtered />
    </Provider>
  )

  fireEvent.click(getByText('button'))
})

it('variable sized splitted atom', async () => {
  const lengthAtom = atom(3)
  const collectionAtom = atom<number[]>([])
  const collectionAtomsAtom = splitAtom(collectionAtom)
  const derivativeAtom = atom((get) =>
    get(collectionAtomsAtom).map((ca) => get(ca))
  )

  function App() {
    const [length, setLength] = useAtom(lengthAtom)
    const setCollection = useSetAtom(collectionAtom)
    const [derivative] = useAtom(derivativeAtom)
    useEffect(() => {
      setCollection([1, 2, 3].splice(0, length))
    }, [length, setCollection])
    return (
      <div>
        <button onClick={() => setLength(2)}>button</button>
        numbers: {derivative.join(',')}
      </div>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <App />
    </Provider>
  )

  await findByText('numbers: 1,2,3')

  fireEvent.click(getByText('button'))
  await findByText('numbers: 1,2')
})
