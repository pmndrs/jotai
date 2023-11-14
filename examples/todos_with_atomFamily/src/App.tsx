import type { FormEvent } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { a, useTransition } from '@react-spring/web'
import { Radio } from 'antd'
import { Provider, atom, useAtom, useSetAtom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import { nanoid } from 'nanoid'

type Param = { id: string; title?: string }
const todoAtomFamily = atomFamily(
  (param: Param) =>
    atom({ title: param.title || 'No title', completed: false }),
  (a: Param, b: Param) => a.id === b.id,
)

const filterAtom = atom('all')
const todosAtom = atom<string[]>([])
const filteredAtom = atom((get) => {
  const filter = get(filterAtom)
  const todos = get(todosAtom)
  if (filter === 'all') return todos
  else if (filter === 'completed')
    return todos.filter((id) => get(todoAtomFamily({ id })).completed)
  else return todos.filter((id) => !get(todoAtomFamily({ id })).completed)
})

const TodoItem = ({
  id,
  remove,
}: {
  id: string
  remove: (id: string) => void
}) => {
  const [item, setItem] = useAtom(todoAtomFamily({ id }))
  const toggleCompleted = () => setItem({ ...item, completed: !item.completed })
  return (
    <>
      <input
        type="checkbox"
        checked={item.completed}
        onChange={toggleCompleted}
      />
      <span style={{ textDecoration: item.completed ? 'line-through' : '' }}>
        {item.title}
      </span>
      <CloseOutlined onClick={() => remove(id)} />
    </>
  )
}

const Filter = () => {
  const [filter, set] = useAtom(filterAtom)
  return (
    <Radio.Group onChange={(e) => set(e.target.value)} value={filter}>
      <Radio value="all">All</Radio>
      <Radio value="completed">Completed</Radio>
      <Radio value="incompleted">Incompleted</Radio>
    </Radio.Group>
  )
}

const Filtered = ({ remove }: { remove: (id: string) => void }) => {
  const [todos] = useAtom(filteredAtom)
  const transitions = useTransition(todos, {
    keys: (id: string) => id,
    from: { opacity: 0, height: 0 },
    enter: { opacity: 1, height: 40 },
    leave: { opacity: 0, height: 0 },
  })
  return transitions((style, id) => (
    <a.div className="item" style={style}>
      <TodoItem id={id} remove={remove} />
    </a.div>
  ))
}

const TodoList = () => {
  // Use `useSetAtom` to avoid re-render
  // const [, setTodos] = useAtom(todosAtom)
  const setTodos = useSetAtom(todosAtom)
  const remove = (id: string) => {
    setTodos((prev) => prev.filter((item) => item !== id))
    todoAtomFamily.remove({ id })
  }
  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const title = e.currentTarget.inputTitle.value
    e.currentTarget.inputTitle.value = ''
    const id = nanoid()
    todoAtomFamily({ id, title })
    setTodos((prev) => [...prev, id])
  }
  return (
    <form onSubmit={add}>
      <Filter />
      <input name="inputTitle" placeholder="Type ..." />
      <Filtered remove={remove} />
    </form>
  )
}

type Action =
  | { type: 'serialize'; callback: (value: string) => void }
  | { type: 'deserialize'; value: string }

const serializeAtom = atom(null, (get, set, action: Action) => {
  if (action.type === 'serialize') {
    const todos = get(todosAtom)
    const todoMap: Record<string, { title: string; completed: boolean }> = {}
    todos.forEach((id) => {
      todoMap[id] = get(todoAtomFamily({ id }))
    })
    const obj = {
      todos,
      todoMap,
      filter: get(filterAtom),
    }
    action.callback(JSON.stringify(obj))
  } else if (action.type === 'deserialize') {
    const obj = JSON.parse(action.value)
    // needs error handling and type checking
    set(filterAtom, obj.filter)
    obj.todos.forEach((id: string) => {
      const todo = obj.todoMap[id]
      set(todoAtomFamily({ id, ...todo }), todo)
    })
    set(todosAtom, obj.todos)
  }
})

const Persist = () => {
  const [, dispatch] = useAtom(serializeAtom)
  const save = () => {
    dispatch({
      type: 'serialize',
      callback: (value) => {
        localStorage.setItem('serializedTodos', value)
      },
    })
  }
  const load = () => {
    const value = localStorage.getItem('serializedTodos')
    if (value) {
      dispatch({ type: 'deserialize', value })
    }
  }
  return (
    <div>
      <button onClick={save}>Save to localStorage</button>
      <button onClick={load}>Load from localStorage</button>
    </div>
  )
}

export default function App() {
  return (
    <Provider>
      <h1>Jōtai</h1>
      <TodoList />
      <h3>Persist</h3>
      <Persist />
    </Provider>
  )
}
