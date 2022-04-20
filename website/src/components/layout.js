import cx from 'classnames'
import useDarkMode from 'use-dark-mode'
import {
  Footer,
  Icon,
  Main,
  Menu,
  SearchModal,
  Sidebar,
  Wrapper,
} from '../components'

const INITIAL_STATE = false

const DARK_MODE_CONFIG = {
  classNameDark: 'dark',
  classNameLight: 'light',
}

export const Layout = ({ showDocs = false, children }) => {
  const darkMode = useDarkMode(INITIAL_STATE, DARK_MODE_CONFIG)

  const lightModeIconClassNames = cx(
    darkMode.value ? 'opacity-100' : 'opacity-0',
    'w-5 h-5 fill-current transition-opacity ease-in-out duration-300'
  )

  const darkModeIconClassNames = cx(
    darkMode.value ? 'opacity-0' : 'opacity-100',
    'absolute left-0 top-0 w-5 h-5 fill-current transition-opacity ease-in-out duration-300'
  )

  return (
    <>
      <Wrapper>
        <header className="absolute lg:fixed top-0 right-0">
          <button
            type="button"
            onClick={darkMode.toggle}
            className="relative inline-flex justify-center items-center m-4 w-7 h-7 rounded-full text-black dark:text-gray-400">
            <div className="relative">
              <Icon icon="sun" className={lightModeIconClassNames} />
              <Icon icon="moon" className={darkModeIconClassNames} />
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
    </>
  )
}
