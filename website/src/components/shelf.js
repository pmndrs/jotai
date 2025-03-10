import { useSetAtom } from 'jotai'
import { menuAtom } from '../atoms/index.js'
import { Button } from '../components/button.js'

export const Shelf = () => {
  const setIsMenuOpen = useSetAtom(menuAtom)

  return (
    <div className="fixed left-0 bottom-0 right-0 lg:hidden">
      <div className="flex w-full justify-center space-x-4 border-t border-gray-700 bg-gray-900 p-4 dark:border-gray-800">
        <Button
          icon="github"
          to="https://github.com/pmndrs/jotai"
          external
          className="font-bold uppercase tracking-wider"
          dark
          small
        >
          GitHub
        </Button>
        <Button
          icon="npm"
          to="https://www.npmjs.com/package/jotai"
          external
          className="font-bold uppercase tracking-wider"
          dark
          small
        >
          npm
        </Button>
        <Button
          icon="book"
          onClick={() => setIsMenuOpen(true)}
          className="font-bold uppercase tracking-wider"
          dark
          small
        >
          Docs
        </Button>
      </div>
      <div className="h-4 w-full bg-black" />
    </div>
  )
}
