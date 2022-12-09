/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();

const DOCS_QUERY = `
  query {
    allMdx {
      nodes {
        slug
        meta: frontmatter {
          title
          description
        }
        headings(depth: h2) {
          value
        }
        excerpt
        rawBody
      }
    }
  }
`;

const queries = [
  {
    query: DOCS_QUERY,
    transformer: ({ data }) =>
      data.allMdx.nodes.map((item) => {
        const transformedNode = {
          objectID: item.slug,
          slug: item.slug,
          title: item.meta.title,
          description: item.meta.description,
          excerpt: item.excerpt,
          body: item.rawBody.replace(/(<([^>]+)>)/gi, ''),
        };

        return transformedNode;
      }),
    indexName: 'Docs',
    settings: {
      searchableAttributes: ['title', 'description', 'slug', 'excerpt', 'body'],
      indexLanguages: ['en'],
    },
    mergeSettings: false,
  },
];

module.exports = {
  siteMetadata: {
    title: `Jotai, primitive and flexible state management for React`,
    description: `Jotai takes a bottom-up approach to React state management with an atomic model inspired by Recoil. One can build state by combining atoms and renders are optimized based on atom dependency. This solves the extra re-render issue of React context and avoids requiring the memoization technique.`,
    siteUrl: `https://jotai.org`,
    shortName: `Jotai`,
  },
  plugins: [
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `docs`,
        path: `../docs`,
      },
    },
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        extensions: [`.md`, `.mdx`],
      },
    },
    `gatsby-plugin-postcss`,
    {
      resolve: 'gatsby-plugin-use-dark-mode',
      options: {
        classNameDark: 'dark',
        classNameLight: 'light',
        storageKey: 'darkMode',
        minify: true,
      },
    },
    {
      resolve: `gatsby-plugin-algolia`,
      options: {
        appId: process.env.GATSBY_ALGOLIA_APP_ID,
        apiKey: process.env.ALGOLIA_ADMIN_KEY,
        queries,
        skipIndexing: process.env.ALGOLIA_SKIP_INDEXING,
      },
    },
    `gatsby-plugin-sitemap`,
    {
      resolve: `gatsby-plugin-google-gtag`,
      options: {
        trackingIds: ['G-WWJ8XD0QP0'],
        gtagConfig: {
          anonymize_ip: true,
          cookie_expires: 0,
        },
        pluginConfig: {
          head: false,
          respectDNT: true,
        },
      },
    },
  ],
  flags: {
    DEV_SSR: false,
    QUERY_ON_DEMAND: true,
    LAZY_IMAGES: true,
    DEV_WEBPACK_CACHE: true,
    PRESERVE_FILE_DOWNLOAD_CACHE: true,
    PARALLEL_SOURCING: true,
  },
  graphqlTypegen: false,
  jsxRuntime: 'automatic',
  polyfill: false,
  trailingSlash: 'never',
};
