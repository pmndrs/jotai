import React from 'react'

import {
  Head,
  PageWrapper,
  Sidebar,
  Main,
  Header,
  Panel,
  InlineCode,
  CoreDemo,
  UtilitiesDemo,
  IntegrationsDemo,
  Footer,
} from '../components'

const HomePage = () => {
  return (
    <>
      <Head />
      <PageWrapper>
        <Sidebar />
        <Main>
          <Header />
          <Panel
            headline="Introduction"
            body={
              <>
                Jotai takes a bottom-up approach to React state management with
                an atomic model inspired by Recoil. One can build state by
                combining atoms and renders are optimized based on atom
                dependency. This solves the extra re-render issue of React
                context and eliminates the need for the memoization technique.
              </>
            }
          />
          <Panel
            headline="Core API"
            body={
              <>
                Jotai has a very minimal API and is TypeScript oriented. It is
                as simple to use as React’s integrated{' '}
                <InlineCode>useState</InlineCode> hook, but all state is
                globally accessible, derived state is easy to implement, and
                extra re-renders are automatically eliminated.
              </>
            }
            demo={<CoreDemo />}
          />
          <Panel
            headline="Extra utils"
            body={
              <>
                The Jotai package also includes a{' '}
                <InlineCode>jotai/utils</InlineCode> bundle. These functions add
                support for persisting an atom’s state in localStorage or a URL
                hash, creating an atom with a set function with redux-like
                reducers and action types, and more.
              </>
            }
            demo={<UtilitiesDemo />}
          />
          <Panel
            headline="Third-party integrations"
            body={
              <>
                There are also additional bundles for each official third-party
                integration. Immer, Optics, Query, XState, Valtio, Zustand, and
                Redux. Some integrations provide new atom types with alternate
                update functions such as <InlineCode>atomWithImmer</InlineCode>{' '}
                while others provide new atom types with two-way data binding
                for other state management libraries such as{' '}
                <InlineCode>atomWithStore</InlineCode> which is bound with a
                Redux store.
              </>
            }
            demo={<IntegrationsDemo />}
          />
          <Footer />
        </Main>
      </PageWrapper>
    </>
  )
}

export default HomePage
