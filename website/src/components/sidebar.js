import React from 'react'

import { Jotai, Button, Docs, Credits } from '../components'

export const Sidebar = ({ showDocs = false }) => {
  return (
    <aside className="sticky top-0 hidden lg:flex flex-col flex-shrink-0 justify-between w-full lg:max-w-[288px] xl:max-w-[384px] 2xl:max-w-[448px] min-h-full h-full max-h-screen overflow-y-scroll overscroll-none p-8 xl:p-16 scrollbar">
      <div className="flex-grow">
        <Jotai isDocsPage={showDocs} />
        <div className="flex flex-col mt-8 space-y-4">
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
            external>
            Course
          </Button>
          <Button icon="discord" to="https://discord.gg/poimandres" external>
            Community
          </Button>
          <Button icon="twitter" to="https://twitter.com/dai_shi" external>
            Updates
          </Button>
        </div>
      </div>
      <div className="inline-flex flex-col mt-8 space-y-2 text-center">
        <Credits />
      </div>
    </aside>
  )
}
