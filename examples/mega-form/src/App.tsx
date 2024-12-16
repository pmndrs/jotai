import { useCallback, useMemo } from 'react'
import { Provider, atom, useAtom } from 'jotai'
import type { PrimitiveAtom } from 'jotai'
import { focusAtom } from 'jotai-optics'
import { useAtomCallback } from 'jotai/utils'
import initialValue from './initialValue'
import useAtomSlice from './useAtomSlice'

const Field = ({
  fieldAtom,
  removeField,
}: {
  fieldAtom: PrimitiveAtom<{ name: string; value: string }>
  removeField: () => void
}) => {
  const nameAtom = useMemo(
    () => focusAtom(fieldAtom, (o) => o.prop('name')),
    [fieldAtom],
  )
  const valueAtom = useMemo(
    () => focusAtom(fieldAtom, (o) => o.prop('value')),
    [fieldAtom],
  )
  const [name, setName] = useAtom(nameAtom)
  const [value, setValue] = useAtom(valueAtom)
  return (
    <div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
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
  const objectsAtom = useMemo(
    () =>
      focusAtom(formAtom, (o) =>
        o.iso(
          (bigObject) =>
            Object.entries(bigObject).map(([name, value]) => ({
              name,
              value,
            })),
          (arrayOfObjects) =>
            Object.fromEntries(
              arrayOfObjects.map(({ name, value }) => [name, value]),
            ),
        ),
      ),
    [formAtom],
  )

  const fieldAtoms = useAtomSlice(objectsAtom)
  const [name, setName] = useAtom(nameAtom)
  const addField = useAtomCallback(
    useCallback(
      (get, set) => {
        const id = Math.floor(Math.random() * 1000)
        set(objectsAtom, (oldValue) => [
          ...oldValue,
          { name: `new field ${id}`, value: '' },
        ])
      },
      [objectsAtom],
    ),
  )

  return (
    <div>
      <div>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={remove}>Remove form</button>
      </div>

      <ul>
        {fieldAtoms.map(([fieldAtom, remove]) => (
          <li key={fieldAtom.toString()}>
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
  const entriesAtom = useMemo(
    () =>
      focusAtom(formListAtom, (o) =>
        o.iso(
          (obj) => Object.entries(obj),
          (array) => Object.fromEntries(array),
        ),
      ),
    [formListAtom],
  )
  const formAtoms = useAtomSlice(entriesAtom)

  const addForm = useAtomCallback(
    useCallback(
      (get, set) => {
        const id = Math.floor(Math.random() * 1000)
        set(entriesAtom, (oldValue) => [...oldValue, [`new form ${id}`, {}]])
      },
      [entriesAtom],
    ),
  )

  const formValues = useMemo(() => {
    return formAtoms.map(([formEntryAtom, remove]) => ({
      nameAtom: focusAtom(formEntryAtom, (o) => o.nth(0)),
      formAtom: focusAtom(formEntryAtom, (o) => o.nth(1)),
      remove,
    }))
  }, [formAtoms])
  return (
    <ul>
      {formValues.map(({ nameAtom, formAtom, remove }) => (
        <li key={nameAtom.toString()}>
          <Form nameAtom={nameAtom} formAtom={formAtom} remove={remove} />
        </li>
      ))}

      <button onClick={addForm}>Add new form</button>
    </ul>
  )
}

const formListAtom = atom(initialValue)

export default function App() {
  return (
    <Provider>
      <h1>Mega form</h1>
      <FormList formListAtom={formListAtom} />
    </Provider>
  )
}
