import cx from 'classnames'

export const Headline = ({ className = '', children }) => {
  return (
    <div
      className={cx(
        'text-4xl font-bold tracking-tight text-black dark:text-gray-50 lg:text-7xl lg:text-gray-300',
        className,
      )}
    >
      {children}
    </div>
  )
}
