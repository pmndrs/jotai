import cx from 'classnames';
import useDarkMode from 'use-dark-mode';
import {
  Footer,
  Icon,
  Main,
  Menu,
  SearchModal,
  Sidebar,
  SupportModal,
  Wrapper,
} from '../components';

const INITIAL_STATE = false;

const DARK_MODE_CONFIG = {
  classNameDark: 'dark',
  classNameLight: 'light',
};

export const Layout = ({ showDocs = false, children }) => {
  const darkMode = useDarkMode(INITIAL_STATE, DARK_MODE_CONFIG);

  return (
    <>
      <Wrapper>
        <header className="absolute top-0 right-0 lg:fixed">
          <button
            type="button"
            onClick={darkMode.toggle}
            className="relative m-4 inline-flex h-7 w-7 items-center justify-center rounded-full text-black dark:text-gray-400"
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
        </header>
        <Sidebar showDocs={showDocs} />
        <Main>
          <div className="prose">{children}</div>
          <Footer />
        </Main>
      </Wrapper>
      <Menu />
      <SearchModal />
      <SupportModal />
    </>
  );
};
