<br>

![Jotai (light mode)](./img/jotai-header-light.png#gh-light-mode-only)
![Jotai (dark mode)](./img/jotai-header-dark.png#gh-dark-mode-only)

<br>

访问 [jotai.org](https://jotai.org) 或者使用 `npm i jotai`

[![Build Status](https://img.shields.io/github/actions/workflow/status/pmndrs/jotai/lint-and-type.yml?branch=main&style=flat&colorA=000000&colorB=000000)](https://github.com/pmndrs/jotai/actions?query=workflow%3ALint)
[![Build Size](https://img.shields.io/bundlephobia/minzip/jotai?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/result?p=jotai)
[![Version](https://img.shields.io/npm/v/jotai?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/jotai)
[![Downloads](https://img.shields.io/npm/dt/jotai.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/jotai)
[![Discord Shield](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=ffffff)](https://discord.gg/poimandres)
[![Open Collective](https://img.shields.io/opencollective/all/jotai?style=flat&colorA=000000&colorB=000000)](https://opencollective.com/jotai)

Jotai 可以从简单的 useState 替代品扩展到企业级 TypeScript 应用。

- 最小核心 API（2kb）
- 许多实用工具和扩展
- 没有字符串键（与 Recoil 相比）

示例：[演示 1](https://codesandbox.io/s/jotai-demo-47wvh) |
[演示 2](https://codesandbox.io/s/jotai-demo-forked-x2g5d)

### 首先，创建一个原子

原子代表了一部分状态。你只需要指定一个初始值，它可以是字符串和数字等基本值，也可以是对象和数组。你可以创建任意多的原子。

```jsx
import { atom } from 'jotai'

const countAtom = atom(0)
const countryAtom = atom('Japan')
const citiesAtom = atom(['Tokyo', 'Kyoto', 'Osaka'])
const mangaAtom = atom({ 'Dragon Ball': 1984, 'One Piece': 1997, Naruto: 1999 })
```

### 在你的组件中使用原子

它可以像 `React.useState` 那样使用：

```jsx
import { useAtom } from 'jotai'

function Counter() {
  const [count, setCount] = useAtom(countAtom)
  return (
    <h1>
      {count}
      <button onClick={() => setCount((c) => c + 1)}>增加一</button>
      ...
```

### 创建带有计算值的派生原子

可以通过传递一个读取函数作为第一个参数，从现有的原子创建一个新的只读原子。`get` 允许你获取任何原子的上下文值。

```jsx
const doubledCountAtom = atom((get) => get(countAtom) * 2)

function DoubleCounter() {
  const [doubledCount] = useAtom(doubledCountAtom)
  return <h2>{doubledCount}</h2>
}
```

### 从多个原子创建一个原子

你可以组合多个原子来创建一个派生原子。

```jsx
const count1 = atom(1)
const count2 = atom(2)
const count3 = atom(3)

const sum = atom((get) => get(count1) + get(count2) + get(count3))
```

或者如果你喜欢函数式编程模式...

```jsx
const atoms = [count1, count2, count3, ...otherAtoms]
const sum = atom((get) => atoms.map(get).reduce((acc, count) => acc + count))
```

### 派生的异步原子 [<img src="https://img.shields.io/badge/-needs_suspense-black" alt="需要悬念" />](https://react.dev/reference/react/Suspense)

你也可以使读取函数成为一个异步函数。

```jsx
const urlAtom = atom('https://json.host.com')
const fetchUrlAtom = atom(async (get) => {
  const response = await fetch(get(urlAtom))
  return await response.json()
})

function Status() {
  // 在urlAtom改变并且上面的异步函数结束后，重新渲染组件
  const [json] = useAtom(fetchUrlAtom)
  ...
```

### 你可以创建一个可写的派生原子

在第二个参数处指定一个写入函数。`get` 将返回一个原子的当前值。`set` 将更新一个原子的值。

```jsx
const decrementCountAtom = atom(
  (get) => get(countAtom),
  (get, set, _arg) => set(countAtom, get(countAtom) - 1)
)

function Counter() {
  const [count, decrement] = useAtom(decrementCountAtom)
  return (
    <h1>
      {count}
      <button onClick={decrement}>减少</button>
      ...
```

### 只写派生原子

只需不定义读取函数即可。

```jsx
const multiplyCountAtom = atom(null, (get, set, by) =>
  set(countAtom, get(countAtom) * by),
)

function Controls() {
  const [, multiply] = useAtom(multiplyCountAtom)
  return <button onClick={() => multiply(3)}>三倍</button>
}
```

### 异步操作

只需使写入函数成为一个异步函数，并在你准备好时调用 `set`。

```jsx
const fetchCountAtom = atom(
  (get) => get(countAtom),
  async (_get, set, url) => {
    const response = await fetch(url)
    set(countAtom, (await response.json()).count)
  }
)

function Controls() {
  const [count, compute] = useAtom(fetchCountAtom)
  return (
    <button onClick={() => compute('http://count.host.com')}>计算</button>
    ...
```

## 链接

- [网站](https://jotai.org)
- [文档](https://jotai.org/docs)
- [课程](https://egghead.io/courses/manage-application-state-with-jotai-atoms-2c3a29f0)
