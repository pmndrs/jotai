import cx from 'classnames'
import { Link } from 'gatsby'
import { Icon } from '../components'

export const Button = ({
  type = 'button',
  onClick,
  icon = undefined,
  disabled = false,
  to,
  external = false,
  dark = false,
  small = false,
  className = '',
  children,
  ...rest
}) => {
  const buttonClassNames = cx(
    'inline-flex items-center border dark:!shadow-none select-none',
    !small
      ? 'px-6 py-3 space-x-4 shadow-md rounded-md sm:rounded-lg text-base'
      : 'px-3 py-1.5 space-x-2 shadow-sm rounded sm:rounded-md text-xs',
    !dark
      ? 'border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 hover:bg-blue-100 text-black dark:text-gray-300'
      : 'border-gray-800 bg-gray-900 text-gray-300',
    !disabled ? 'cursor-pointer' : 'cursor-not-allowed',
    className
  )

  const iconClassNames = cx(
    'flex-shrink-0 object-contain fill-current',
    !small ? 'w-6 h-6' : 'w-4 h-4',
    !dark ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300'
  )

  if (onClick && to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        role="button"
        className={buttonClassNames}
        {...rest}>
        {icon && <Icon icon={icon} className={iconClassNames} />}
        <span>{children}</span>
      </Link>
    )
  } else if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={buttonClassNames}
        {...rest}>
        {icon && <Icon icon={icon} className={iconClassNames} />}
        <span>{children}</span>
      </button>
    )
  } else if (to && external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener"
        className={buttonClassNames}
        {...rest}>
        {icon && <Icon icon={icon} className={iconClassNames} />}
        <span>{children}</span>
      </a>
    )
  } else if (to) {
    return (
      <Link to={to} className={buttonClassNames} {...rest}>
        {icon && <Icon icon={icon} className={iconClassNames} />}
        <span>{children}</span>
      </Link>
    )
  } else {
    return (
      <button
        type={type}
        disabled={disabled}
        className={buttonClassNames}
        {...rest}>
        {icon && <Icon icon={icon} className={iconClassNames} />}
        <span>{children}</span>
      </button>
    )
  }
}
