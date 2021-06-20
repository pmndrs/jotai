import React from 'react'
import { Link } from 'gatsby'
import cx from 'classnames'

import { Icon } from '../components'

export const Button = ({
  type = 'button',
  onClick,
  icon = undefined,
  disabled = false,
  to,
  external = false,
  className = '',
  dark = false,
  children,
}) => {
  const buttonClasses = cx(
    'inline-flex items-center px-6 py-3 space-x-4 border rounded-lg text-base focus:outline-none transition duration-300 ease-in-out',
    !dark
      ? 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600'
      : 'border-gray-700 bg-gray-900 text-gray-300',
    !disabled ? 'cursor-pointer' : 'cursor-not-allowed',
    'select-none',
    className
  )

  const iconClasses = cx(
    'w-6 h-6 object-contain fill-current',
    !dark ? 'text-gray-600' : 'text-gray-300'
  )

  if (onClick && to) {
    return (
      <Link to={to} onClick={onClick} role="button" className={buttonClasses}>
        {icon && <Icon icon={icon} className={iconClasses} />}
        <span>{children}</span>
      </Link>
    )
  } else if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={buttonClasses}>
        {icon && <Icon icon={icon} className={iconClasses} />}
        <span>{children}</span>
      </button>
    )
  } else if (to && external) {
    return (
      <a href={to} target="_blank" rel="noopener" className={buttonClasses}>
        {icon && <Icon icon={icon} className={iconClasses} />}
        <span>{children}</span>
      </a>
    )
  } else if (to) {
    return (
      <Link to={to} className={buttonClasses}>
        {icon && <Icon icon={icon} className={iconClasses} />}
        <span>{children}</span>
      </Link>
    )
  } else if (type) {
    return (
      <button type={type} disabled={disabled} className={buttonClasses}>
        {icon && <Icon icon={icon} className={iconClasses} />}
        <span>{children}</span>
      </button>
    )
  }
  return null
}
