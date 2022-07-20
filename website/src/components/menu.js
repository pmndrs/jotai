import cx from 'classnames';
import { useAtom } from 'jotai';
import { menuAtom } from '../atoms';
import { Button, Docs, SearchButton } from '../components';

export const Menu = () => {
  const [isMenuOpen, setIsMenuOpen] = useAtom(menuAtom);

  return (
    <>
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
      <div
        className={cx(
          isMenuOpen
            ? 'pointer-events-auto opacity-100 lg:pointer-events-none lg:opacity-0'
            : 'pointer-events-none opacity-0',
          'fixed inset-0 z-50 flex max-h-screen items-end bg-black/75 p-4 transition duration-300 ease-in-out sm:p-6',
        )}
      >
        <div className="max-h-full w-full overflow-y-scroll !overscroll-none rounded-lg border border-gray-300 bg-white p-8 shadow-2xl dark:border-gray-800 dark:bg-gray-950 dark:!shadow-none">
          <div className="px-3 pb-16 sm:pb-0">
            <div className="-mx-3 mb-6">
              <SearchButton className="w-full" />
            </div>
            <Docs />
          </div>
          <div className="z-70 fixed left-8 right-8 bottom-8 sm:left-auto sm:right-16 sm:bottom-16">
            <Button
              icon="close"
              onClick={() => setIsMenuOpen(false)}
              className="w-full font-bold uppercase tracking-wider"
              dark
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
