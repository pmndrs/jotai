import cx from 'classnames'

export const InlineCode = ({ dark = false, children }) => {
  return (
    <code
      className={cx(
        'relative -top-px rounded px-1 py-0.5 text-sm lg:text-base',
        !dark
          ? 'bg-gray-100 text-black dark:bg-gray-800 dark:text-gray-300'
          : 'bg-gray-200 text-black dark:bg-gray-700 dark:text-gray-200',
      )}
    >
      {children}
    </code>
  )
}
