/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config()

const DOCS_QUERY = `
  query {
    allMdx {
      nodes {
        slug
        meta: frontmatter {
          title
          description
        }
        excerpt
        rawBody
      }
    }
  }
`

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
        }

        return transformedNode
      }),
    indexName: 'Docs',
    settings: {
      searchableAttributes: ['title', 'description', 'slug', 'excerpt', 'body'],
      indexLanguages: ['en'],
    },
    mergeSettings: false,
  },
]

module.exports = {
  siteMetadata: {
    title: `Jotai, primitive and flexible state management for React`,
    description: `Jotai takes a bottom-up approach to React state management with an atomic model inspired by Recoil. One can build state by combining atoms and renders are optimized based on atom dependency. This solves the extra re-render issue of React context and avoids requiring the memoization technique.`,
    siteUrl: `https://jotai.org`,
    shortName: `Jotai`,
  },
  plugins: [
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `docs`,
        path: `../docs`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `./src/images`,
      },
    },
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        extensions: [`.md`, `.mdx`],
      },
    },
    `gatsby-plugin-postcss`,
    `gatsby-plugin-image`,
    {
      resolve: `gatsby-plugin-sharp`,
      options: {
        defaults: {
          placeholder: 'none',
          formats: ['auto', 'webp', 'avif'],
          quality: 90,
        },
        failOnError: false,
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
    `gatsby-plugin-remove-trailing-slashes`,
  ],
  jsxRuntime: 'automatic',
  flags: {
    FAST_DEV: true,
  },
}
