import React from 'react'
import { fireEvent, cleanup, render } from '@testing-library/react'
import { Provider, atom, useAtom, PrimitiveAtom } from '../src/index'

const consoleError = console.error
afterEach(() => {
  cleanup()
  console.error = consoleError
})

it('remove an item, then add another', async () => {
  type Item = {
    text: string
    checked: boolean
  }
  let itemIndex = 0
  const itemsAtom = atom<PrimitiveAtom<Item>[]>([])

  const ListItem: React.FC<{
    itemAtom: PrimitiveAtom<Item>
    remove: () => void
  }> = ({ itemAtom, remove }) => {
    const [item, setItem] = useAtom(itemAtom)
    const toggle = () =>
      setItem((prev) => ({ ...prev, checked: !prev.checked }))
    return (
      <>
        <div>
          {item.text} checked: {item.checked ? 'yes' : 'no'}
        </div>
        <button onClick={toggle}>Check {item.text}</button>
        <button onClick={remove}>Remove {item.text}</button>
      </>
    )
  }

  const List: React.FC = () => {
    const [items, setItems] = useAtom(itemsAtom)
    const addItem = () => {
      setItems((prev) => [
        ...prev,
        atom<Item>({ text: `item${++itemIndex}`, checked: false }),
      ])
    }
    const removeItem = (itemAtom: PrimitiveAtom<Item>) => {
      setItems((prev) => prev.filter((x) => x !== itemAtom))
    }
    return (
      <ul>
        {items.map((itemAtom) => (
          <ListItem
            key={itemAtom.key}
            itemAtom={itemAtom}
            remove={() => removeItem(itemAtom)}
          />
        ))}
        <li>
          <button onClick={addItem}>Add</button>
        </li>
      </ul>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <List />
    </Provider>
  )

  fireEvent.click(getByText('Add'))
  await findByText('item1 checked: no')

  fireEvent.click(getByText('Add'))
  await findByText('item1 checked: no')
  await findByText('item2 checked: no')

  fireEvent.click(getByText('Check item2'))
  await findByText('item1 checked: no')
  await findByText('item2 checked: yes')

  fireEvent.click(getByText('Remove item1'))
  await findByText('item2 checked: yes')

  fireEvent.click(getByText('Add'))
  await findByText('item2 checked: yes')
  await findByText('item3 checked: no')
})
