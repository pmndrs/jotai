import { atom, Provider, useAtom, PrimitiveAtom } from 'jotai'
import { focusAtom } from '../../src/optics'
import React, { useMemo, useEffect, useRef } from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { useAtomCallback } from '../../src/utils'
import { splitAtom } from '../../src/utils/splitAtom'

type TodoItem = { task: string; checked?: boolean }

it('no unneccesary updates when updating atoms', async () => {
  const formListAtom = atom<Record<string, Record<string, string>>>({
    form: { hello: 'world' },
  })
  const utils = render(
    <Provider>
      <FormList formListAtom={formListAtom} />
    </Provider>
  )

  const whatsup = await utils.findByTestId('world')
  fireEvent.change(whatsup, { target: { value: 'some change' } })
})

const Field = ({
  fieldAtom,
  removeField,
}: {
  fieldAtom: PrimitiveAtom<{ name: string; value: string }>
  removeField: () => void
}) => {
  const [name, setName] = useAtom(focusAtom(fieldAtom, (o) => o.prop('name')))
  const [value, setValue] = useAtom(
    focusAtom(fieldAtom, (o) => o.prop('value'))
  )
  return (
    <div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
        data-testid={value}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button onClick={removeField}>X</button>
    </div>
  )
}

const Form = ({
  formAtom,
  nameAtom,
  remove,
}: {
  formAtom: PrimitiveAtom<Record<string, string>>
  nameAtom: PrimitiveAtom<string>
  remove: () => void
}) => {
  const objectsAtom = focusAtom(formAtom, (o) =>
    o.iso(
      (bigObject) =>
        Object.entries(bigObject).map(([name, value]) => ({
          name,
          value,
        })),
      (arrayOfObjects) =>
        Object.fromEntries(
          arrayOfObjects.map(({ name, value }) => [name, value])
        )
    )
  )
  const fieldAtoms = useAtomSlice(objectsAtom)
  const [name, setName] = useAtom(nameAtom)

  const addField = useAtomCallback((get, set) => {
    const id = Math.floor(Math.random() * 1000)
    set(objectsAtom, (oldValue) => [
      ...oldValue,
      { name: `new field ${id}`, value: '' },
    ])
  })

  return (
    <div>
      <div>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={remove}>Remove form</button>
      </div>

      <ul>
        {fieldAtoms.map(([fieldAtom, remove], index) => (
          <li key={index}>
            <Field fieldAtom={fieldAtom} removeField={remove} />
          </li>
        ))}
      </ul>
      <button onClick={addField}>Add field</button>
    </div>
  )
}

const FormList = ({
  formListAtom,
}: {
  formListAtom: PrimitiveAtom<Record<string, Record<string, string>>>
}) => {
  const entriesAtom = focusAtom(formListAtom, (o) =>
    o.iso(
      (obj) => Object.entries(obj),
      (array) => Object.fromEntries(array)
    )
  )
  const formAtoms = useAtomSlice(entriesAtom)

  const addForm = useAtomCallback((get, set) => {
    const id = Math.floor(Math.random() * 1000)
    set(entriesAtom, (oldValue) => [...oldValue, [`new form ${id}`, {}]])
  })

  return (
    <ul>
      {formAtoms.map(([formEntryAtom, remove], index) => (
        <li key={index}>
          <Form
            nameAtom={focusAtom(formEntryAtom, (o) => o.nth(0))}
            formAtom={focusAtom(formEntryAtom, (o) => o.nth(1))}
            remove={remove}
          />
        </li>
      ))}

      <button onClick={addForm}>Add new form</button>
    </ul>
  )
}
const useAtomSlice = <Item,>(arrAtom: PrimitiveAtom<Item[]>) => {
  const [atoms, remove] = useAtom(
    React.useMemo(() => splitAtom(arrAtom), [arrAtom])
  )
  return React.useMemo(
    () => atoms.map((itemAtom) => [itemAtom, () => remove(itemAtom)] as const),
    [atoms, remove]
  )
}
