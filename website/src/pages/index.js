import React from 'react'
import { StaticImage } from 'gatsby-plugin-image'

import { Head, Layout, Intro, InlineCode } from '../components'
import { CoreDemo, UtilitiesDemo, IntegrationsDemo } from '../demos'

export default function HomePage() {
  return (
    <>
      <Head />
      <Layout>
        <Intro />
        <div className="mt-8 lg:mt-16 space-y-8 lg:space-y-16">
          <section>
            <h2>Introduction</h2>
            <p>
              Jotai takes a bottom-up approach to React state management with an
              atomic model inspired by Recoil. One can build state by combining
              atoms and renders are optimized based on atom dependency. This
              solves the extra re-render issue of React context and eliminates
              the need for the memoization technique.
            </p>
          </section>
          <section>
            <h2>Core API</h2>
            <p>
              Jotai has a very minimal API and is TypeScript oriented. It is as
              simple to use as React’s integrated{' '}
              <InlineCode>useState</InlineCode> hook, but all state is globally
              accessible, derived state is easy to implement, and extra
              re-renders are automatically eliminated.
            </p>
            <CoreDemo />
          </section>
          <section>
            <h2>Extra utilities</h2>
            <p>
              The Jotai package also includes a{' '}
              <InlineCode>jotai/utils</InlineCode> bundle. These functions add
              support for persisting an atom’s state in localStorage (or URL
              hash), hydrating an atom’s state during server-side rendering,
              creating an atom with a set function including Redux-like reducers
              and action types, and much more!
            </p>
            <UtilitiesDemo />
          </section>
          <section>
            <h2>Third-party integrations</h2>
            <p>
              There are also additional bundles for each official third-party
              integration. Immer, Optics, Query, XState, Valtio, Zustand, Redux,
              and URQL.
            </p>
            <p>
              Some integrations provide new atom types with alternate set
              functions such as <InlineCode>atomWithImmer</InlineCode> while
              others provide new atom types with two-way data binding with other
              state management libraries such as{' '}
              <InlineCode>atomWithStore</InlineCode> which is bound with a Redux
              store.
            </p>
            <IntegrationsDemo />
          </section>
          <section>
            <h2>Learn more</h2>
            <p>
              Check out the free Egghead course by Daishi, the creator of Jotai.
            </p>
            <a
              href="https://egghead.io/courses/manage-application-state-with-jotai-atoms-2c3a29f0"
              target="_blank"
              rel="noopener"
              className="block mt-4">
              <StaticImage
                src="../images/egghead.png"
                className="block shadow-lg rounded-md sm:rounded-lg"
                imgStyle={{ objectFit: 'contain' }}
                layout="fullWidth"
                placeholder="blurred"
                formats={['auto']}
                sizes="50vw"
                outputPixelDensities={[1]}
                breakpoints={[480, 640, 768, 1080]}
                alt="Jotai course"
                title="Jotai course"
              />
            </a>
          </section>
        </div>
      </Layout>
    </>
  )
}
