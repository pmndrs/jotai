# How to persist atoms

The core itself doesn't support persistence.
There are some patterns for persistence depending on requirements.

## A simple pattern with localStorage

```js
const strAtom = atom(localStorage.getItem('myKey') ?? 'foo')

const strAtomWithPersistence = atom(
  get => get(strAtom),
  (get, set, newStr) => {
    set(strAtom, newStr)
    localStorage.setItem('myKey', newStr)
  }
)
```

## Combined into a single atom

```js
const langAtom = atom(
  localStorage.getItem('lang') || 'es',
  (get, set, newLang) => {
    localStorage.setItem('lang', newLang);
    set(langAtom, newLang)
  }
)
```

However, the above is not typescript friendly.
We could use a util for typescript.

```ts
const langAtom = atomWithReducer(
  localStorage.getItem('lang') || 'es',
  (_prev, newLang: string) => {
    localStorage.setItem('lang', newLang)
    return newLang
  }
)
```

## A useEffect pattern

```js
const strAtom = atom('foo')

const Component = () => {
  const [str, setStr] = useAtom(strAtom)
  useEffect(() => {
    if (forTheFirstTimeOrWeWantToRefresh) {
      const savedStr = localStorage.getItem('myKey')
      if (savedStr !== null) {
        setStr(savedStr)
      }
    }
    if (weWantToSaveItForThisTime) {
      localStorage.setItem('myKey', str)
    }
  })
)
```

## A write-only atom pattern

```js
const createPersistAtom = (anAtom, key, serialize, deserialize) => atom(
  null,
  async (get, set, action) => {
    if (action.type === 'init') {
      const str = await AsyncStorage.getItem(key)
      set(anAtom, deserialize(str)
    } else if (action.type === 'set') {
      const str = serialize(get(anAtom))
      await AsyncStorage.setItem(key, str)
    }
  }
)
```

## A serialize atom pattern

```tsx
const serializeAtom = atom<
  null,
  | { type: "serialize"; callback: (value: string) => void }
  | { type: "deserialize"; value: string }
>(null, (get, set, action) => {
  if (action.type === "serialize") {
    const obj = {
      todos: get(todosAtom).map(get)
    };
    action.callback(JSON.stringify(obj));
  } else if (action.type === "deserialize") {
    const obj = JSON.parse(action.value);
    // needs error handling and type checking
    set(
      todosAtom,
      obj.todos.map((todo: Todo) => atom(todo))
    );
  }
});

const Persist: React.FC = () => {
  const [, dispatch] = useAtom(serializeAtom);
  const save = () => {
    dispatch({
      type: "serialize",
      callback: (value) => {
        localStorage.setItem("serializedTodos", value);
      }
    });
  };
  const load = () => {
    const value = localStorage.getItem("serializedTodos");
    if (value) {
      dispatch({ type: "deserialize", value });
    }
  };
  return (
    <div>
      <button onClick={save}>Save to localStorage</button>
      <button onClick={load}>Load from localStorage</button>
    </div>
  );
};
```

### Examples

https://codesandbox.io/s/jotai-todos-ijyxm

## A pattern with atomFamily

```tsx
const serializeAtom = atom<
  null,
  | { type: "serialize"; callback: (value: string) => void }
  | { type: "deserialize"; value: string }
>(null, (get, set, action) => {
  if (action.type === "serialize") {
    const todos = get(todosAtom);
    const todoMap: Record<string, { title: string; completed: boolean }> = {};
    todos.forEach((id) => {
      todoMap[id] = get(todoAtomFamily({ id }));
    });
    const obj = {
      todos,
      todoMap,
      filter: get(filterAtom)
    };
    action.callback(JSON.stringify(obj));
  } else if (action.type === "deserialize") {
    const obj = JSON.parse(action.value);
    // needs error handling and type checking
    set(filterAtom, obj.filter);
    obj.todos.forEach((id: string) => {
      const todo = obj.todoMap[id];
      set(todoAtomFamily({ id, ...todo }), todo);
    });
    set(todosAtom, obj.todos);
  }
});

const Persist: React.FC = () => {
  const [, dispatch] = useAtom(serializeAtom);
  const save = () => {
    dispatch({
      type: "serialize",
      callback: (value) => {
        localStorage.setItem("serializedTodos", value);
      }
    });
  };
  const load = () => {
    const value = localStorage.getItem("serializedTodos");
    if (value) {
      dispatch({ type: "deserialize", value });
    }
  };
  return (
    <div>
      <button onClick={save}>Save to localStorage</button>
      <button onClick={load}>Load from localStorage</button>
    </div>
  );
};
```

### Examples

https://codesandbox.io/s/react-typescript-forked-eilkg
