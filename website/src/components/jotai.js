import cx from 'classnames';
import { Link } from 'gatsby';
import { Logo } from '../components';

export const Jotai = ({ isDocsPage = false, small = false, ...rest }) => {
  return (
    <div {...rest}>
      <Headline mainTitle={!isDocsPage}>
        <Link to="/" className="inline-block rounded-lg focus:ring-offset-4">
          <Logo
            className={cx(
              isDocsPage
                ? 'text-gray-300 transition duration-300 ease-in-out hover:text-black dark:text-white dark:hover:text-white '
                : 'text-black dark:text-white',
              !small ? 'w-full max-w-[12rem] lg:max-w-[16rem] 2xl:max-w-[18rem]' : 'w-[4rem]',
            )}
          />
        </Link>
        <span className="sr-only">Jotai</span>
      </Headline>
      <div
        className={cx(
          !small
            ? 'mt-2 space-x-6 text-gray-400 lg:space-x-4 2xl:mt-6 2xl:space-x-6'
            : 'mt-1 space-x-2 text-gray-350 dark:text-gray-500',
          'flex items-center',
        )}
      >
        <div className={cx(!small ? 'text-lg 2xl:text-xl' : 'text-xs', 'whitespace-nowrap')}>
          状態
        </div>
        <div
          className={cx(!small ? 'text-sm leading-snug 2xl:text-base' : 'text-xs leading-tight')}
        >
          Primitive and flexible state management for React
        </div>
      </div>
    </div>
  );
};

const Headline = ({ mainTitle = false, children, ...rest }) => {
  return mainTitle ? <h1 {...rest}>{children}</h1> : <h2 {...rest}>{children}</h2>;
};
