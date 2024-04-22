/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();

const kebabCase = require('just-kebab-case');
const getAnchor = (value) => {
  return typeof value === 'string' ? kebabCase(value.toLowerCase().replaceAll("'", '')) : '';
};

const DOCS_QUERY = `
  query {
    allMdx {
      nodes {
        slug
        meta: frontmatter {
          title
          description
          keywords
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
    transformer: ({ data }) => {
      const results = [];

      data.allMdx.nodes.forEach((item) => {
        const transformedNode = {
          objectID: item.slug,
          slug: item.slug,
          title: item.meta.title,
          description: item.meta.description,
          keywords: item.meta?.keywords?.split(',') ?? [],
          excerpt: item.excerpt,
          headings: item.headings.map((heading) => heading.value).join(' '),
          body: item.rawBody.replace(/(<([^>]+)>)/gi, ''),
          level: 1,
        };

        if (item.slug !== 'introduction') {
          item.headings
            .map((heading) => heading.value)
            .forEach((heading) => {
              const transformedNode = {
                objectID: `${item.slug}#${getAnchor(heading)}`,
                slug: `${item.slug}#${getAnchor(heading)}`,
                title: heading,
                description: '',
                keywords: [],
                excerpt: '',
                headings: [],
                body: '',
                level: 2,
              };

              results.push(transformedNode);
            });
        }

        results.push(transformedNode);
      });

      return results;
    },
    indexName: 'Docs',
    settings: {
      searchableAttributes: [
        'slug',
        'title',
        'description',
        'keywords',
        'excerpt',
        'headings',
        'body',
      ],
      indexLanguages: ['en'],
    },
    mergeSettings: false,
  },
];

module.exports = {
  pathPrefix: `/jotai-zh`,
  siteMetadata: {
    title: `Jotai，React 的原子化和灵活的状态管理`,
    description: `Jotai 采用自下而上的方法来进行全局 React 状态管理，其原子模型受到 Recoil 的启发。人们可以通过组合原子来构建状态，渲染基于原子依赖进行优化。这解决了 React 上下文的额外重新渲染问题，并消除了对 memoization 的需要。`,
    siteUrl: `https://ouweiya.github.io/jotai-zh/`,
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
    // {
    //   resolve: `gatsby-plugin-algolia`,
    //   options: {
    //     appId: process.env.GATSBY_ALGOLIA_APP_ID,
    //     apiKey: process.env.ALGOLIA_ADMIN_KEY,
    //     queries,
    //     skipIndexing: process.env.ALGOLIA_SKIP_INDEXING === 'true',
    //   },
    // },
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
    LAZY_IMAGES: true,
    PRESERVE_FILE_DOWNLOAD_CACHE: true,
    PARALLEL_SOURCING: true,
  },
  graphqlTypegen: false,
  jsxRuntime: 'automatic',
  polyfill: false,
  trailingSlash: 'never',
};
