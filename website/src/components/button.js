import cx from 'classnames';
import { Link } from 'gatsby';
import { Icon } from '../components';

export const Button = ({
  type = 'button',
  onClick,
  icon = undefined,
  disabled = false,
  to,
  external = false,
  dark = false,
  bold = false,
  small = false,
  className = '',
  children,
  ...rest
}) => {
  const buttonClassNames = cx(
    'inline-flex select-none items-center border dark:!shadow-none',
    bold && 'font-medium',
    !small
      ? 'space-x-4 rounded-md px-6 py-3 text-base shadow-md sm:rounded-lg'
      : 'space-x-2 rounded px-3 py-1.5 text-xs shadow-sm sm:rounded-md',
    !dark
      ? 'border-gray-200 bg-gray-100 text-black hover:bg-blue-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:!border-teal-800 dark:hover:bg-teal-950 dark:text-gray-300'
      : 'border-gray-800 bg-gray-900 text-gray-300',
    !disabled ? 'cursor-pointer' : 'cursor-not-allowed',
    className,
  );

  const iconClassNames = cx(
    'flex-shrink-0 fill-current object-contain',
    !small ? 'h-6 w-6' : 'h-4 w-4',
    !dark ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300',
  );

  if (onClick && to) {
    return (
      <Link to={to} onClick={onClick} role="button" className={buttonClassNames} {...rest}>
        {icon && <Icon icon={icon} className={iconClassNames} />}
        <span>{children}</span>
      </Link>
    );
  } else if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={buttonClassNames}
        {...rest}
      >
        {icon && <Icon icon={icon} className={iconClassNames} />}
        <span>{children}</span>
      </button>
    );
  } else if (to && external) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={buttonClassNames} {...rest}>
        {icon && <Icon icon={icon} className={iconClassNames} />}
        <span>{children}</span>
      </a>
    );
  } else if (to) {
    return (
      <Link to={to} className={buttonClassNames} {...rest}>
        {icon && <Icon icon={icon} className={iconClassNames} />}
        <span>{children}</span>
      </Link>
    );
  } else {
    return (
      <button type={type} disabled={disabled} className={buttonClassNames} {...rest}>
        {icon && <Icon icon={icon} className={iconClassNames} />}
        <span>{children}</span>
      </button>
    );
  }
};
