export const RESET: unique symbol = Symbol(
  process.env.NODE_ENV !== 'production' ? 'RESET' : '',
)
