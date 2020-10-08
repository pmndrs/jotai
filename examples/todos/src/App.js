import * as React from "react"
import { Provider, atom, useAtom } from "jotai"
import { Radio } from "antd"
import { CloseOutlined } from "@ant-design/icons"
import { a, useTransition } from "@react-spring/web"

const filterAtom = atom("all")
const todosAtom = atom([])
const filteredAtom = atom((get) => {
  const filter = get(filterAtom)
  const todos = get(todosAtom)
  if (filter === "all") return todos
  else if (filter === "completed") return todos.filter((atom) => get(atom).completed)
  else return todos.filter((atom) => !get(atom).completed)
})

const TodoItem = ({ atom, remove }) => {
  const [item, setItem] = useAtom(atom)
  const toggleCompleted = () => setItem((props) => ({ ...props, completed: !props.completed }))
  return (
    <>
      <input type="checkbox" checked={item.completed} onChange={toggleCompleted} />
      <span style={{ textDecoration: item.completed ? "line-through" : "" }}>{item.title}</span>
      <CloseOutlined onClick={() => remove(atom)} />
    </>
  )
}

function Filter() {
  const [filter, set] = useAtom(filterAtom)
  return (
    <Radio.Group onChange={(e) => set(e.target.value)} value={filter}>
      <Radio value="all">All</Radio>
      <Radio value="completed">Completed</Radio>
      <Radio value="incompleted">Incompleted</Radio>
    </Radio.Group>
  )
}

function Filtered(props) {
  const [todos] = useAtom(filteredAtom)
  const transitions = useTransition(todos, {
    keys: (todo) => todo.key,
    from: { opacity: 0, height: 0 },
    enter: { opacity: 1, height: 40 },
    leave: { opacity: 0, height: 0 },
  })
  return transitions((style, atom) => (
    <a.div className="item" style={style}>
      <TodoItem atom={atom} {...props} />
    </a.div>
  ))
}

const TodoList = () => {
  const [, setTodos] = useAtom(todosAtom)
  const remove = (todo) => setTodos((prev) => prev.filter((item) => item !== todo))
  const add = (e) => {
    e.preventDefault()
    const title = e.currentTarget.inputTitle.value
    e.currentTarget.inputTitle.value = ""
    setTodos((prev) => [...prev, atom({ title, completed: false })])
  }
  return (
    <form onSubmit={add}>
      <Filter />
      <input name="inputTitle" placeholder="Type ..." />
      <Filtered remove={remove} />
    </form>
  )
}

export default function App() {
  return (
    <Provider>
      <h1>Jōtai</h1>
      <TodoList />
    </Provider>
  )
}
