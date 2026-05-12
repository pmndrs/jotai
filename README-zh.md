<br>

![Jotai (light mode)](./img/jotai-header-light.png#gh-light-mode-only)
![Jotai (dark mode)](./img/jotai-header-dark.png#gh-dark-mode-only)

<br>

访问 [jotai.org](https://jotai.org) 或 `npm i jotai`

[![Build Status](https://img.shields.io/github/actions/workflow/status/pmndrs/jotai/test.yml?branch=main&style=flat&colorA=000000&colorB=000000)](https://github.com/pmndrs/jotai/actions/workflows/test.yml?query=branch%3Amain)
[![Build Size](https://img.shields.io/bundlephobia/minzip/jotai?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/result?p=jotai)
[![Version](https://img.shields.io/npm/v/jotai?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/jotai)
[![Downloads](https://img.shields.io/npm/dt/jotai.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/jotai)
[![Discord Shield](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=ffffff)](https://discord.gg/poimandres)
[![Open Collective](https://img.shields.io/opencollective/all/jotai?style=flat&colorA=000000&colorB=000000)](https://opencollective.com/jotai)

# Jotai

Jotai 从简单的 useState 替代品扩展到企业级 TypeScript 应用。

## 特性

- 🪶 **极简核心 API**：只有 2kb
- 🔧 **丰富的工具和扩展**
- 🔑 **无字符串键**（相比 Recoil）
- 🎯 **TypeScript 优先**
- ⚡ **高性能**：只重新渲染变化的部分
- 🔄 **支持异步**
- 🔌 **可扩展**：支持自定义扩展

## 安装

```bash
npm install jotai
```

## 快速开始

### 基本用法

```jsx
import { atom, useAtom } from 'jotai'

// 创建 atom
const countAtom = atom(0)

function Counter() {
  const [count, setCount] = useAtom(countAtom)
  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  )
}
```

### 派生 atom

```jsx
import { atom, useAtom } from 'jotai'

const countAtom = atom(0)
const doubleCountAtom = atom((get) => get(countAtom) * 2)

function DoubleCounter() {
  const [count] = useAtom(countAtom)
  const [doubleCount] = useAtom(doubleCountAtom)
  return (
    <div>
      <h1>Count: {count}</h1>
      <h1>Double: {doubleCount}</h1>
    </div>
  )
}
```

### 可写派生 atom

```jsx
import { atom, useAtom } from 'jotai'

const countAtom = atom(0)
const decrementCountAtom = atom(
  (get) => get(countAtom),
  (get, set) => set(countAtom, get(countAtom) - 1)
)

function DecrementCounter() {
  const [count, decrement] = useAtom(decrementCountAtom)
  return (
    <div>
      <h1>{count}</h1>
      <button onClick={decrement}>-1</button>
    </div>
  )
}
```

### 异步 atom

```jsx
import { atom, useAtom } from 'jotai'

const userAtom = atom(async () => {
  const response = await fetch('/api/user')
  return response.json()
})

function User() {
  const [user] = useAtom(userAtom)
  return <div>{user.name}</div>
}
```

## 与 Redux 的比较

| 特性 | Jotai | Redux |
|------|-------|-------|
| API 复杂度 | 简单 | 复杂 |
| 包大小 | 2kb | 11kb |
| TypeScript 支持 | 优秀 | 良好 |
| 学习曲线 | 低 | 中等 |
| DevTools | 有 | 有 |
| 中间件 | 有 | 有 |

## 与 Recoil 的比较

| 特性 | Jotai | Recoil |
|------|-------|--------|
| API 复杂度 | 简单 | 复杂 |
| 包大小 | 2kb | 11kb |
| 字符串键 | 无 | 有 |
| 持久化 | 有 | 无 |
| 异步支持 | 有 | 有 |

## 示例

- [演示 1](https://codesandbox.io/s/jotai-demo-47wvh)
- [演示 2](https://codesandbox.io/s/jotai-demo-forked-x2g5d)

## 文档

访问 [jotai.org](https://jotai.org) 查看完整文档。

## 贡献

欢迎贡献！请阅读 [贡献指南](./CONTRIBUTING.md) 了解如何参与。

## 许可证

MIT
