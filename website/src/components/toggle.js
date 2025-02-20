import { useCallback, useEffect } from 'react'
import cx from 'classnames'
import { useAtom } from 'jotai'
import { darkModeAtom } from '../atoms/index.js'
import { Icon } from '../components/icon.js'

export const Toggle = () => {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom)

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!darkMode)
  }, [darkMode, setDarkMode])

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark')
      document.body.classList.remove('light')
    } else {
      document.body.classList.add('light')
      document.body.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <div className="absolute top-0 right-0 lg:fixed">
      <button
        type="button"
        onClick={toggleDarkMode}
        className="relative m-4 inline-flex h-10 w-10 select-none items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-black shadow-md hover:border-blue-200 hover:bg-blue-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:!shadow-none dark:hover:!border-teal-800 dark:hover:bg-teal-950"
      >
        <div className="relative">
          <Icon
            icon="sun"
            className={cx(
              darkMode ? 'opacity-100' : 'opacity-0',
              'h-5 w-5 fill-current transition-opacity duration-300 ease-in-out',
            )}
          />
          <Icon
            icon="moon"
            className={cx(
              darkMode ? 'opacity-0' : 'opacity-100',
              'absolute left-0 top-0 h-5 w-5 fill-current transition-opacity duration-300 ease-in-out',
            )}
          />
        </div>
      </button>
    </div>
  )
}
