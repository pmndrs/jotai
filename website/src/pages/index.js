import { Code } from '../components/code.js';
import { CoreDemo } from '../components/core-demo.js';
import { ExtensionsDemo } from '../components/extensions-demo.js';
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
          <Headline>介绍</Headline>
          <p>Jotai 采用原子化的方法进行全局 React 状态管理。</p>
          <p>
            通过组合原子来构建状态，渲染会根据原子依赖自动优化。这解决了 React 上下文的额外重新渲染问题，消除了对 memoization 的需要，并在保持声明式编程模型的同时，提供了类似于信号的开发者体验。
          </p>
          <p>
            它可以从简单的 <InlineCode>useState</InlineCode> 替代品扩展到具有复杂需求的企业级 TypeScript 应用程序。此外，还有许多实用工具和扩展可以帮助你！
          </p>
          <p>Jotai 在这些创新公司的生产环境中得到了信任。</p>
          <LogoCloud />
        </div>
        <div className="space-y-4">
          <Headline>入门</Headline>
          <p className="!mb-8">
            这将引导你创建一个简单的 Jotai 应用程序的过程。从安装开始，然后探索核心 API 的基础知识，最后在 React 框架中进行服务器端渲染。
          </p>
          <Tabs tabs={gettingStartedTabs} />
        </div>
        <div className="space-y-4">
          <Headline>API 概览</Headline>
          <Tabs tabs={apiTabs} />
        </div>
        <div className="space-y-4">
          <Headline>了解更多</Headline>
          <p>查看 Jotai 创建者 Daishi 的免费 Egghead 课程。</p>
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
      <h2>核心</h2>
      <p>
        Jotai的API非常简洁，以TypeScript为主。它的使用就像React的内置<InlineCode>useState</InlineCode>钩子一样简单，但所有的状态都可以全局访问，
        派生状态易于实现，且自动消除了不必要的重新渲染。
      </p>
      <CoreDemo />
    </section>
  ),
  Utilities: (
    <section>
      <h2>实用工具</h2>
      <p>
        Jotai包还包括一个<InlineCode>jotai/utils</InlineCode>包。这些额外的函数增加了在localStorage中持久化原子的支持，服务端渲染时的原子水合，
        创建具有Redux-like的reducers和action类型的原子等等。
      </p>
      <UtilitiesDemo />
    </section>
  ),
  Extensions: (
    <section>
      <h2>扩展</h2>
      <p>
        还有每个官方扩展的单独包：tRPC，Immer，Query，XState，URQL，Optics，Relay，location，molecules，cache等等。
      </p>
      <p>
        一些扩展提供了新的原子类型，带有替代的写函数，例如<InlineCode>atomWithImmer</InlineCode>（Immer）或<InlineCode>atomWithMachine</InlineCode>（XState）。
      </p>
      <p>
        其他的提供了新的原子类型，带有双向数据绑定，例如<InlineCode>atomWithLocation</InlineCode>或<InlineCode>atomWithHash</InlineCode>。
      </p>
      <ExtensionsDemo />
    </section>
  ),
};

const gettingStartedTabs = {
  'Installation': (
    <section>
      <h2>安装</h2>
      <p>首先将 Jotai 作为依赖添加到你的 React 项目中。</p>
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
      <h2>创建原子</h2>
      <p>首先创建原始和派生的原子来构建状态。</p>
      <h3>原始原子</h3>
      <p>
        原始原子可以是任何类型：布尔值，数字，字符串，对象，数组，集合，映射等等。
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
      <h3>派生原子</h3>
      <p>派生原子可以在返回其自身的值之前读取其他原子的值。</p>
      <Code>{`const progressAtom = atom((get) => {
  const anime = get(animeAtom)
  return anime.filter((item) => item.watched).length / anime.length
})`}</Code>
    </section>
  ),
  'Use atoms': (
    <section>
      <h2>使用原子</h2>
      <p>然后在 React 组件中使用原子来读取或写入状态。</p>
      <h3>在同一组件中读取和写入</h3>
      <p>
        当在同一组件中同时读取和写入原子时，为了简单起见，使用组合的
        <InlineCode>useAtom</InlineCode> hook。
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
      <h3>从不同的组件读取和写入</h3>
      <p>
        当原子值只被读取或写入时，使用单独的
        <InlineCode>useAtomValue</InlineCode> 和 <InlineCode>useSetAtom</InlineCode> 钩子来
        优化重新渲染。
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
      <h2>服务器端渲染</h2>
      <p>
        如果使用 Next.js 或 Gatsby 等框架进行服务器端渲染，请确保至少在根部使用一个 Provider 组件。
      </p>
      <Code>{`import { Provider } from 'jotai'

// Placement is framework-specific (see below)
<Provider>
  {...}
</Provider>
`}</Code>
      <h3>Next.js (应用目录)</h3>
      <p>
        在一个单独的客户端组件中创建 provider。然后将 provider 导入到根<InlineCode>layout.js</InlineCode>服务器组件中。
      </p>
      <Code>{`// providers.js (app directory)
'use client'

import { Provider } from 'jotai'

export default function Providers({ children }) {
  return (
    <Provider>
      {children}
    </Provider>
  )
}


// layout.js (app directory)
import Providers from './providers'

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
      <h3>Next.js (页面目录)</h3>
      <p>
        在 <InlineCode>_app.js</InlineCode> 中创建 provider。
      </p>
      <Code>{`// _app.js (pages directory)
import { Provider } from 'jotai'

export default function App({ Component, pageProps }) {
  return (
    <Provider>
      <Component {...pageProps} />
    </Provider>
  )
}
`}</Code>
      <h3>Gatsby</h3>
      <p>
        在 <InlineCode>gatsby-shared.js</InlineCode> 文件中创建 provider，以在 <InlineCode>gatsby-browser.js</InlineCode> 和
        <InlineCode>gatsby-ssr.js</InlineCode> 之间共享代码。使用 <InlineCode>wrapRootElement</InlineCode> API
        来放置 provider。
      </p>
      <Code>{`
// gatsby-shared.js
import { Provider } from 'jotai'

export const wrapRootElement = ({ element }) => {
  return (
    <Provider>
      {element}
    </Provider>
  )
}

// gatsby-browser.js
export { wrapRootElement } from './gatsby-shared'

// gatsby-ssr.js
export { wrapRootElement } from './gatsby-shared'
`}</Code>
    </section>
  ),
};

export const Head = () => {
  return <Meta />;
};
