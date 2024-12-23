import '@testing-library/jest-dom/vitest'
import { expect, vi } from 'vitest'

type MockFunction = ReturnType<typeof vi.fn>

expect.extend({
  toHaveBeenCalledBefore(received: MockFunction, expected: MockFunction) {
    const pass =
      received.mock.invocationCallOrder[0]! <
      expected.mock.invocationCallOrder[0]!
    return {
      pass,
      message: () =>
        `expected ${received} to have been called before ${expected}`,
    }
  },
})
