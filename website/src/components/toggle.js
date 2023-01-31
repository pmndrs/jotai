import cx from 'classnames';
import useDarkMode from 'use-dark-mode';
import { Icon } from '../components/icon';

const INITIAL_STATE = false;

const DARK_MODE_CONFIG = {
  classNameDark: 'dark',
  classNameLight: 'light',
};

export const Toggle = () => {
  const darkMode = useDarkMode(INITIAL_STATE, DARK_MODE_CONFIG);

  return (
    <div className="absolute top-0 right-0 lg:fixed">
      <button
        type="button"
        onClick={darkMode.toggle}
        className="relative m-4 inline-flex h-10 w-10 select-none items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-black shadow-md hover:border-blue-200 hover:bg-blue-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:!shadow-none dark:hover:!border-teal-800 dark:hover:bg-teal-950"
      >
        <div className="relative">
          <Icon
            icon="sun"
            className={cx(
              darkMode.value ? 'opacity-100' : 'opacity-0',
              'h-5 w-5 fill-current transition-opacity duration-300 ease-in-out',
            )}
          />
          <Icon
            icon="moon"
            className={cx(
              darkMode.value ? 'opacity-0' : 'opacity-100',
              'absolute left-0 top-0 h-5 w-5 fill-current transition-opacity duration-300 ease-in-out',
            )}
          />
        </div>
      </button>
    </div>
  );
};
