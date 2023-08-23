import { StrictMode, useEffect, useRef } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import type { Atom, PrimitiveAtom } from 'jotai/vanilla'
import { splitAtom } from 'jotai/vanilla/utils'

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
        {atoms.map((anAtom) => (
          <TaskItem
            key={`${anAtom}`}
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
    <>
      <TaskList listAtom={todosAtom} />
    </>
  )

  await waitFor(() => {
    getByText('TaskListUpdates: 1')
    getByText('get cat food commits: 1')
    getByText('get dragon food commits: 1')
  })

  const catBox = getByTestId('get cat food-checkbox') as HTMLInputElement
  const dragonBox = getByTestId('get dragon food-checkbox') as HTMLInputElement

  expect(catBox.checked).toBeFalsy()
  expect(dragonBox.checked).toBeFalsy()

  fireEvent.click(catBox)

  await waitFor(() => {
    getByText('TaskListUpdates: 1')
    getByText('get cat food commits: 2')
    getByText('get dragon food commits: 1')
  })

  expect(catBox.checked).toBeTruthy()
  expect(dragonBox.checked).toBeFalsy()

  fireEvent.click(dragonBox)

  await waitFor(() => {
    getByText('TaskListUpdates: 1')
    getByText('get cat food commits: 2')
    getByText('get dragon food commits: 2')
  })

  expect(catBox.checked).toBeTruthy()
  expect(dragonBox.checked).toBeTruthy()
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
        {atoms.map((anAtom) => (
          <TaskItem
            key={`${anAtom}`}
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
    <StrictMode>
      <TaskList listAtom={todosAtom} />
    </StrictMode>
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
          {atoms.map((anAtom) => (
            <TaskItem
              key={`${anAtom}`}
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
    <StrictMode>
      <TaskList listAtom={todosAtom} />
    </StrictMode>
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

it('moving atoms', async () => {
  const todosAtom = atom<TodoItem[]>([
    { task: 'get cat food' },
    { task: 'get dragon food' },
    { task: 'help nana' },
  ])

  const TaskList = ({ listAtom }: { listAtom: typeof todosAtom }) => {
    const [atoms, dispatch] = useAtom(splitAtom(listAtom))
    return (
      <ul data-testid="list">
        {atoms.map((anAtom, index) => (
          <TaskItem
            key={`${anAtom}`}
            onMoveLeft={() => {
              if (index > 0) {
                dispatch({
                  type: 'move',
                  atom: anAtom,
                  before: atoms[index - 1] as PrimitiveAtom<TodoItem>,
                })
              }
            }}
            onMoveRight={() => {
              if (index === atoms.length - 1) {
                dispatch({
                  type: 'move',
                  atom: anAtom,
                })
              } else if (index < atoms.length - 1) {
                dispatch({
                  type: 'move',
                  atom: anAtom,
                  before: atoms[index + 2] as PrimitiveAtom<TodoItem>,
                })
              }
            }}
            itemAtom={anAtom}
          />
        ))}
      </ul>
    )
  }

  const TaskItem = ({
    itemAtom,
    onMoveLeft,
    onMoveRight,
  }: {
    itemAtom: PrimitiveAtom<TodoItem>
    onMoveLeft: () => void
    onMoveRight: () => void
  }) => {
    const [value] = useAtom(itemAtom)
    return (
      <li>
        <div>{value.task}</div>
        <button data-testid={`${value.task}-leftbutton`} onClick={onMoveLeft}>
          &lt;
        </button>
        <button data-testid={`${value.task}-rightbutton`} onClick={onMoveRight}>
          &gt;
        </button>
      </li>
    )
  }

  const { getByTestId, queryByTestId } = render(
    <StrictMode>
      <TaskList listAtom={todosAtom} />
    </StrictMode>
  )

  await waitFor(() => {
    expect(queryByTestId('list')?.textContent).toBe(
      'get cat food<>get dragon food<>help nana<>'
    )
  })

  fireEvent.click(getByTestId('help nana-leftbutton'))
  await waitFor(() => {
    expect(queryByTestId('list')?.textContent).toBe(
      'get cat food<>help nana<>get dragon food<>'
    )
  })

  fireEvent.click(getByTestId('get cat food-rightbutton'))
  await waitFor(() => {
    expect(queryByTestId('list')?.textContent).toBe(
      'help nana<>get cat food<>get dragon food<>'
    )
  })

  fireEvent.click(getByTestId('get cat food-rightbutton'))
  await waitFor(() => {
    expect(queryByTestId('list')?.textContent).toBe(
      'help nana<>get dragon food<>get cat food<>'
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
        {atoms.map((anAtom) => (
          <TaskItem key={`${anAtom}`} itemAtom={anAtom} />
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
    <StrictMode>
      <TaskList listAtom={todosAtom} />
    </StrictMode>
  )

  const catBox = getByTestId('get cat food-checkbox') as HTMLInputElement
  const dragonBox = getByTestId('get dragon food-checkbox') as HTMLInputElement

  await waitFor(() => {
    expect(catBox.checked).toBeFalsy()
    expect(dragonBox.checked).toBeFalsy()
  })
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

  type NumItemProps = { atom: Atom<number> }

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
    <StrictMode>
      <Filter />
      <Filtered />
    </StrictMode>
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
    <StrictMode>
      <App />
    </StrictMode>
  )

  await findByText('numbers: 1,2,3')

  fireEvent.click(getByText('button'))
  await findByText('numbers: 1,2')
})

it('should not update splitted atom when single item is set to identical value', async () => {
  const initialCollection = [1, 2, 3]
  const collectionAtom = atom<number[]>(initialCollection)
  const collectionAtomsAtom = splitAtom(collectionAtom)

  function App() {
    const collectionAtoms = useAtomValue(collectionAtomsAtom)
    const setItem2 = useSetAtom(collectionAtoms[1]!)
    const currentCollection = useAtomValue(collectionAtom)
    return (
      <div>
        <button onClick={() => setItem2(2)}>button</button>
        changed: {(!Object.is(currentCollection, initialCollection)).toString()}
      </div>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <App />
    </StrictMode>
  )

  await findByText('changed: false')

  fireEvent.click(getByText('button'))
  await findByText('changed: false')
})
