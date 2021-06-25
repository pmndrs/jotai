import React from 'react'
import cx from 'classnames'
import { useAtom } from 'jotai'

import { darkModeAtom } from '../atoms'
import { ClientOnly, Code } from '../components'

export const UtilitiesDemo = () => {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom)

  const code = `import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// Set the string key and the initial value
const darkModeAtom = atomWithStorage('darkMode', false)

const Page = () => {
  // Consume persisted state like any other atom
  const [darkMode, setDarkMode] = useAtom(darkModeAtom)
  return (
    <>
      <h1>Welcome to {darkMode ? 'dark' : 'light'} mode!</h1>
      <button onClick={() => setDarkMode(!darkMode)}>toggle theme</button>
    </>
  )
}`

  return (
    <>
      <div className="py-8">
        <ClientOnly>
          <div className="flex items-center p-4 lg:p-8 space-x-4 lg:space-x-8 focus-within:ring bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl transition duration-300 ease-in-out">
            <div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={cx(
                  darkMode ? 'bg-gray-700' : 'bg-gray-300',
                  'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none'
                )}>
                <span
                  className={cx(
                    darkMode ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200'
                  )}
                  aria-hidden="true"
                />
              </button>
            </div>
            <div className="text-sm lg:text-lg leading-relaxed">
              This toggle will be persisted between user sessions via
              localStorage.
            </div>
          </div>
        </ClientOnly>
      </div>
      <Code code={code} />
    </>
  )
}
