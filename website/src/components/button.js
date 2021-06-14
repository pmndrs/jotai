import React from 'react';
import { Link } from 'gatsby';
import cx from 'classnames';

import { Icon } from '~components';

export const Button = ({
  type = 'button',
  onClick,
  icon = undefined,
  disabled = false,
  to,
  external = false,
  className = '',
  children,
}) => {
  const buttonClasses = cx(
    'inline-flex items-center px-6 py-3 space-x-6 border border-gray-200 hover:border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 text-lg focus:outline-none transition duration-300 ease-in-out',
    !disabled ? 'cursor-pointer' : 'cursor-not-allowed',
    'select-none',
    className,
  );

  const iconClasses = 'w-8 h-8 object-contain';

  if (onClick && to) {
    return (
      <Link to={to} onClick={onClick} role="button" className={buttonClasses}>
        {icon && <Icon icon={icon} className={iconClasses} />}
        <span>{children}</span>
      </Link>
    );
  } else if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={buttonClasses}>
        {icon && <Icon icon={icon} className={iconClasses} />}
        <span>{children}</span>
      </button>
    );
  } else if (to && external) {
    return (
      <a href={to} target="_blank" rel="noopener" className={buttonClasses}>
        {icon && <Icon icon={icon} className={iconClasses} />}
        <span>{children}</span>
      </a>
    );
  } else if (to) {
    return (
      <Link to={to} className={buttonClasses}>
        {icon && <Icon icon={icon} className={iconClasses} />}
        <span>{children}</span>
      </Link>
    );
  } else if (type) {
    return (
      <button type={type} disabled={disabled} className={buttonClasses}>
        {icon && <Icon icon={icon} className={iconClasses} />}
        <span>{children}</span>
      </button>
    );
  }
  return null;
};
