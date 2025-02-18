import cx from 'classnames'
import { useAtom } from 'jotai'
import { menuAtom } from '../atoms/index.js'
import { Button } from '../components/button.js'
import { Docs } from '../components/docs.js'
import { Icon } from '../components/icon.js'
import { SearchButton } from '../components/search-button.js'
import { useOnEscape } from '../hooks/index.js'

export const Menu = () => {
  const [isMenuOpen, setIsMenuOpen] = useAtom(menuAtom)

  useOnEscape(() => setIsMenuOpen(false))

  return (
    <div
      className={cx(
        isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible',
        'fixed inset-0 z-50 flex h-screen max-h-screen items-end bg-black/75 p-4 sm:p-6 lg:p-8',
      )}
    >
      <div className="max-h-full h-full w-full overflow-y-scroll !overscroll-none rounded-lg border border-gray-300 bg-white p-8 shadow-2xl dark:border-gray-800 dark:bg-gray-950 dark:!shadow-none lg:!overflow-y-auto lg:p-16">
        <div className="px-3 pb-16 sm:pb-0 max-w-[1920px] mx-auto">
          <div className="-mx-3 mb-6 lg:hidden">
            <SearchButton className="w-full" />
          </div>
          <h2 className="hidden 2xl:block mb-8 2xl:mb-16 text-4xl font-extrabold leading-tight tracking-tight text-black dark:text-gray-50 lg:text-7xl lg:tracking-tighter">
            Jotai docs
          </h2>
          <Docs className="my-8 space-y-8 lg:my-0 lg:space-y-0 lg:grid lg:grid-cols-5 lg:gap-8" />
        </div>
        <div className="z-70 fixed left-8 right-8 bottom-8 sm:left-auto sm:right-16 sm:bottom-16 lg:bottom-auto lg:top-16">
          <Button
            icon="close"
            onClick={() => setIsMenuOpen(false)}
            className="w-full font-bold uppercase tracking-wider lg:hidden"
            dark
          >
            Close
          </Button>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="hidden lg:block"
            aria-label="Close"
          >
            <Icon
              icon="close"
              className="w-8 h-8 text-gray-700 dark:text-gray-300 dark:group-hover:text-black' : 'text-gray-300 flex-shrink-0 fill-current object-contain transition ease-in-out duration-300"
            />
          </button>
        </div>
      </div>
    </div>
  )
}
