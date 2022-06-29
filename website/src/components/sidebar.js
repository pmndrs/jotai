import { Button, Credits, Docs, Jotai, SearchButton } from '../components';

export const Sidebar = ({ showDocs = false }) => {
  return (
    <aside className="scrollbar sticky top-0 hidden h-full max-h-screen min-h-full w-full flex-shrink-0 flex-col justify-between overflow-y-scroll overscroll-none p-8 lg:flex lg:max-w-[288px] xl:max-w-[384px] xl:p-16 2xl:max-w-[448px]">
      <div className="flex-grow">
        <Jotai isDocsPage={showDocs} />
        <div className="mt-8 flex flex-col space-y-4">
          <SearchButton />
          {showDocs ? (
            <Button to="/" icon="home">
              Home
            </Button>
          ) : (
            <Button to="/docs/introduction" icon="book">
              Documentation
            </Button>
          )}
          {showDocs && (
            <div className="px-3">
              <Docs />
            </div>
          )}
          <Button icon="github" to="https://github.com/pmndrs/jotai" external>
            Repository
          </Button>
          <Button icon="npm" to="https://www.npmjs.com/package/jotai" external>
            Package
          </Button>
          <Button
            icon="cap"
            to="https://egghead.io/courses/manage-application-state-with-jotai-atoms-2c3a29f0"
            external
          >
            Course
          </Button>
          <Button
            icon="chalkboard"
            to="https://daishi.gumroad.com/l/learn-jotai/website_qpiwdj8"
            external
          >
            Walkthrough
          </Button>
          <Button icon="discord" to="https://discord.gg/poimandres" external>
            Community
          </Button>
          <Button icon="twitter" to="https://twitter.com/dai_shi" external>
            Updates
          </Button>
        </div>
      </div>
      <div className="mt-8 inline-flex flex-col space-y-2 text-center">
        <Credits />
      </div>
    </aside>
  );
};
