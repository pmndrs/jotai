import { useEffect, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom } from 'jotai'
import type { Atom, PrimitiveAtom } from 'jotai'
import { splitAtom, useUpdateAtom } from 'jotai/utils'
import { getTestProvider } from '../testUtils'

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

  const TaskList = ({ listAtom }: { listAtom: typeof todosAtom }) => {
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

  const TaskList = ({ listAtom }: { listAtom: typeof todosAtom }) => {
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
    const prevAtoms = useRef<T[]>(atoms)
    return prevAtoms.current
  }

  type NumItemProps = {
    atom: Atom<number>
  }

  const NumItem = ({ atom }: NumItemProps) => {
    const [readOnlyItem] = useAtom(atom)
    return <>{readOnlyItem}</>
  }

  function Filter() {
    const [filter, set] = useAtom(filterAtom)

    const handlechange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const Filtered = () => {
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

it.only('variable sized splitted atom', async () => {
  const warn = jest.spyOn(global.console, 'warn')

  const collectionAtom = atom<number[]>([])
  const collectionAtomsAtom = splitAtom(collectionAtom)

  const derivativeAtom = atom((get) =>
    get(collectionAtomsAtom).map(
      (ca) => get(ca) + Math.round(Math.random() * 150)
    )
  )

  const numberAtom = atom(1)

  const generateCollection = (number: number) =>
    Array.from({ length: Math.round(Math.random() * 30) }, (_, i) => i + number)

  function App() {
    const [number, setNumber] = useAtom(numberAtom)
    const setCollection = useUpdateAtom(collectionAtom)
    const [derivative] = useAtom(derivativeAtom)

    const generatedCollection = generateCollection(number)

    useEffect(() => {
      setCollection(generatedCollection)
    }, [generatedCollection, number, setCollection])

    return (
      <div>
        <button
          onClick={() => {
            setNumber((prev) => prev + 1)
          }}>
          +{number}
        </button>

        {derivative.map((d, i) => (
          <p key={i}>{d}</p>
        ))}
      </div>
    )
  }

  const { getByText } = render(
    <Provider>
      <App />
    </Provider>
  )

  fireEvent.click(getByText('+1'))

  expect(warn).not.toHaveBeenCalled()
  warn.mockReset()
  warn.mockRestore()
})
