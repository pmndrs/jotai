import '@testing-library/jest-dom/vitest'
import { expect } from 'vitest'

expect.extend({
  toHaveBeenCalledBefore(received, expected) {
    const pass =
      received.mock.invocationCallOrder[0] <
      expected.mock.invocationCallOrder[0]
    return {
      pass,
      message: () =>
        `expected ${received} to have been called before ${expected}`,
    }
  },
})
