import { useSetAtom } from 'jotai'
import { menuAtom, helpAtom } from '../atoms/index.js'
import { Button } from '../components/button.js'
import { Credits } from '../components/credits.js'
import { Jotai } from '../components/jotai.js'
import { SearchButton } from '../components/search-button.js'

export const Sidebar = ({ isDocs = false }) => {
  const setIsMenuOpen = useSetAtom(menuAtom)
  const setShowHelp = useSetAtom(helpAtom)

  return (
    <aside className="scrollbar sticky top-0 hidden h-full max-h-screen min-h-full w-full flex-shrink-0 flex-col justify-between overflow-y-scroll overscroll-none p-8 lg:flex lg:max-w-[288px] xl:max-w-[384px] xl:p-16 2xl:max-w-[448px]">
      <div className="flex-grow">
        <Jotai isDocs={isDocs} />
        <div className="mt-8 flex flex-col space-y-4">
          <SearchButton />
          {!isDocs ? (
            <Button to="/docs" icon="book">
              Documentation
            </Button>
          ) : (
            <>
              <Button to="/docs" icon="book" className="xl:hidden">
                Documentation
              </Button>
              <Button
                onClick={() => setIsMenuOpen(true)}
                icon="book"
                className="!hidden xl:!flex"
              >
                Documentation
              </Button>
            </>
          )}
          <Button icon="chalkboard" to="https://tutorial.jotai.org" external>
            Tutorial
          </Button>
          <Button icon="help" onClick={() => setShowHelp(true)}>
            Support
          </Button>
          <Button icon="github" to="https://github.com/pmndrs/jotai" external>
            Repository
          </Button>
          <Button
            icon="npm"
            to="https://www.npmjs.com/package/jotai"
            external
            className="hidden 2xl:inline-flex"
          >
            Package
          </Button>
          <Button
            icon="discord"
            to="https://discord.gg/poimandres"
            external
            className="hidden 2xl:inline-flex"
          >
            Community
          </Button>
          <Button
            icon="twitter"
            to="https://twitter.com/jotaijs"
            external
            className="hidden 2xl:inline-flex"
          >
            Updates
          </Button>
        </div>
      </div>
      <div className="mt-6 inline-flex flex-col space-y-1.5 text-center">
        <Credits />
      </div>
    </aside>
  )
}
