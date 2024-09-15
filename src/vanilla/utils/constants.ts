export const RESET: unique symbol = Symbol(
  import.meta.env?.MODE !== 'production' ? 'RESET' : '',
)
