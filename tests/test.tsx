import React from 'react'
import ReactDOM from 'react-dom'
import { act, cleanup, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../src/index'

const consoleError = console.error
afterEach(() => {
  cleanup()
  console.error = consoleError
})

it('creates a primitive atom', () => {
  const result = atom(0)
  expect({ result }).toMatchInlineSnapshot(`
    Object {
      "result": Object {
        "initialValue": 0,
        "read": [Function],
        "write": [Function],
      },
    }
  `)
})
