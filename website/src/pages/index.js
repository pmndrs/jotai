import { Code } from '../components/code.js';
import { CoreDemo } from '../components/core-demo.js';
import { ExtensionsDemo } from '../components/extensions-demo.js';
import { ExternalLink } from '../components/external-link.js';
import { Headline } from '../components/headline.js';
import { InlineCode } from '../components/inline-code.js';
import { Intro } from '../components/intro.js';
import { LogoCloud } from '../components/logo-cloud.js';
import { Meta } from '../components/meta.js';
import { Tabs } from '../components/tabs.js';
import { UtilitiesDemo } from '../components/utilities-demo.js';

export default function HomePage() {
  return (
    <>
      <Intro />
      <div className="mt-12 space-y-12 lg:mt-24 lg:space-y-24">
        <div className="space-y-4">
          <Headline>Introduction</Headline>
          <p>Jotai takes an atomic approach to global React state management.</p>
          <p>
            Build state by combining atoms and renders are automatically optimized based on atom
            dependency. This solves the extra re-render issue of React context, eliminates the need
            for memoization, and provides a similar developer experience to signals while
            maintaining a declarative programming model.
          </p>
          <p>
            It scales from a simple <InlineCode>useState</InlineCode> replacement to an enterprise
            TypeScript application with complex requirements. Plus there are plenty of utilities and
            extensions to help you along the way!
          </p>
          <p>Jotai is trusted in production at innovative companies like these.</p>
          <LogoCloud />
        </div>
        <div className="space-y-4">
          <Headline>Getting started</Headline>
          <p className="!mb-8">
            This walks you through the process of creating a simple Jotai application. It starts
            with installation, then explores the basics of the core API, and ends with server-side
            rendering in a React framework.
          </p>
          <Tabs tabs={gettingStartedTabs} />
        </div>
        <div className="space-y-4">
          <Headline>API overview</Headline>
          <Tabs tabs={apiTabs} />
        </div>
        <div className="space-y-4">
          <Headline>Learn more</Headline>
          <p>Check out the free Egghead course by Daishi, the creator of Jotai.</p>
          <a
            href="https://egghead.io/courses/manage-application-state-with-jotai-atoms-2c3a29f0"
            target="_blank"
            rel="noreferrer"
            className="mt-4 block"
          >
            <img
              src="https://cdn.candycode.com/jotai/jotai-course-banner.jpg"
              className="block rounded-md shadow-lg dark:!shadow-none sm:rounded-lg"
              alt="Jotai course"
              title="Jotai course"
            />
          </a>
        </div>
      </div>
    </>
  );
}

const apiTabs = {
  Core: (
    <section>
      <h2>Core</h2>
      <p>
        Jotai has a very minimal API and is TypeScript oriented. It is as simple to use as React’s
        integrated <InlineCode>useState</InlineCode> hook, but all state is globally accessible,
        derived state is easy to implement, and unnecessary re-renders are automatically eliminated.
      </p>
      <CoreDemo />
    </section>
  ),
  Utilities: (
    <section>
      <h2>Utilities</h2>
      <p>
        The Jotai package also includes a <InlineCode>jotai/utils</InlineCode> bundle. These extra
        functions add support for persisting an atom in localStorage, hydrating an atom during
        server-side rendering, creating atoms with Redux-like reducers and action types, and much
        more.
      </p>
      <UtilitiesDemo />
    </section>
  ),
  Extensions: (
    <section>
      <h2>Extensions</h2>
      <p>
        There are also separate packages for each official extension: tRPC, Immer, Query, XState,
        URQL, Optics, Relay, location, molecules, cache, and more.
      </p>
      <p>
        Some extensions provide new atom types with alternate write functions such as{' '}
        <InlineCode>atomWithImmer</InlineCode> (Immer) or <InlineCode>atomWithMachine</InlineCode>{' '}
        (XState).
      </p>
      <p>
        Others provide new atom types with two-way data binding such as{' '}
        <InlineCode>atomWithLocation</InlineCode> or <InlineCode>atomWithHash</InlineCode>.
      </p>
      <ExtensionsDemo />
    </section>
  ),
};

const gettingStartedTabs = {
  'Installation': (
    <section>
      <h2>Installation</h2>
      <p>First add Jotai as a dependency to your React project.</p>
      <Code language="bash">{`# npm
npm i jotai

# yarn
yarn add jotai

# pnpm
pnpm add jotai
`}</Code>
    </section>
  ),
  'Create atoms': (
    <section>
      <h2>Create atoms</h2>
      <p>First create primitive and derived atoms to build state.</p>
      <h3>Primitive atoms</h3>
      <p>
        A primitive atom can be any type: booleans, numbers, strings, objects, arrays, sets, maps,
        and so on.
      </p>
      <Code>{`import { atom } from 'jotai'

const countAtom = atom(0)

const countryAtom = atom('Japan')

const citiesAtom = atom(['Tokyo', 'Kyoto', 'Osaka'])

const animeAtom = atom([
  {
    title: 'Ghost in the Shell',
    year: 1995,
    watched: true
  },
  {
    title: 'Serial Experiments Lain',
    year: 1998,
    watched: false
  }
])`}</Code>
      <h3>Derived atoms</h3>
      <p>A derived atom can read from other atoms before returning its own value.</p>
      <Code>{`const progressAtom = atom((get) => {
  const anime = get(animeAtom)
  return anime.filter((item) => item.watched).length / anime.length
})`}</Code>
    </section>
  ),
  'Use atoms': (
    <section>
      <h2>Use atoms</h2>
      <p>Then use atoms within React components to read or write state.</p>
      <h3>Read and write from same component</h3>
      <p>
        When atoms are both read and written within the same component, use the combined{' '}
        <InlineCode>useAtom</InlineCode> hook for simplicity.
      </p>
      <Code>{`import { useAtom } from 'jotai'

const AnimeApp = () => {
  const [anime, setAnime] = useAtom(animeAtom)

  return (
    <>
      <ul>
        {anime.map((item) => (
          <li key={item.title}>{item.title}</li>
        ))}
      </ul>
      <button onClick={() => {
        setAnime((anime) => [
          ...anime,
          {
            title: 'Cowboy Bebop',
            year: 1998,
            watched: false
          }
        ])
      }}>
        Add Cowboy Bebop
      </button>
    <>
  )
}`}</Code>
      <h3>Read and write from separate components</h3>
      <p>
        When atom values are only read or written, use the separate{' '}
        <InlineCode>useAtomValue</InlineCode> and <InlineCode>useSetAtom</InlineCode> hooks to
        optimize re-renders.
      </p>
      <Code>{`import { useAtomValue, useSetAtom } from 'jotai'

const AnimeList = () => {
  const anime = useAtomValue(animeAtom)

  return (
    <ul>
      {anime.map((item) => (
        <li key={item.title}>{item.title}</li>
      ))}
    </ul>
  )
}

const AddAnime = () => {
  const setAnime = useSetAtom(animeAtom)

  return (
    <button onClick={() => {
      setAnime((anime) => [
        ...anime,
        {
          title: 'Cowboy Bebop',
          year: 1998,
          watched: false
        }
      ])
    }}>
      Add Cowboy Bebop
    </button>
  )
}

const ProgressTracker = () => {
  const progress = useAtomValue(progressAtom)

  return (
    <div>{Math.trunc(progress * 100)}% watched</div>
  )
}

const AnimeApp = () => {
  return (
    <>
      <AnimeList />
      <AddAnime />
      <ProgressTracker />
    </>
  )
}`}</Code>
    </section>
  ),
  'SSR': (
    <section>
      <h2>Server-side rendering</h2>
      <p>
        If server-side rendering with a framework such as{' '}
        <ExternalLink to="https://nextjs.org">Next.js</ExternalLink> or{' '}
        <ExternalLink to="https://waku.gg">Waku</ExternalLink>, make sure to add a Jotai Provider
        component at the root.
      </p>
      <h3>Next.js (app directory)</h3>
      <p>
        Create the provider in a separate client component. Then import the provider into the root{' '}
        <InlineCode>layout.js</InlineCode> server component.
      </p>
      <Code>{`// ./components/providers.js
'use client'

import { Provider } from 'jotai'

export const Providers = ({ children }) => {
  return (
    <Provider>
      {children}
    </Provider>
  )
}


// ./app/layout.js
import { Providers } from '../components/providers'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
`}</Code>
      <h3>Next.js (pages directory)</h3>
      <p>
        Create the provider in <InlineCode>_app.js</InlineCode>.
      </p>
      <Code>{`// ./pages/_app.js
import { Provider } from 'jotai'

export default function App({ Component, pageProps }) {
  return (
    <Provider>
      <Component {...pageProps} />
    </Provider>
  )
}
`}</Code>
      <h3>Waku</h3>
      <p>
        Create the provider in a separate client component. Then import the provider into the root
        layout.
      </p>
      <Code>{`// ./src/components/providers.js
'use client'

import { Provider } from 'jotai'

export const Providers = ({ children }) => {
  return (
    <Provider>
      {children}
    </Provider>
  )
}


// ./src/pages/_layout.js
import { Providers } from '../components/providers'

export default async function RootLayout({ children }) {
  return (
    <Providers>
      {children}
    </Providers>
  )
}
`}</Code>
    </section>
  ),
};

export const Head = () => {
  return <Meta />;
};
