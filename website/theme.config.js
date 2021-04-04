// theme.config.js
export default {
  repository: 'https://github.com/pmndrs/jotai', // project repo
  docsRepository: 'https://github.com/pmndrs/jotai', // docs repo
  branch: 'docs', // branch of docs
  path: '/', // path of docs
  titleSuffix: ' – Nextra',
  nextLinks: true,
  prevLinks: true,
  search: true,
  customSearch: null, // customizable, you can use algolia for example
  darkMode: true,
  footer: true,
  footerText: 'MIT 2021 © Daishi Kato.',
  footerEditOnGitHubLink: true, // will link to the docs repo
  logo: (
    <>
      <span>👻 Jotai</span>
    </>
  ),
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta
        name="description"
        content="Primitive and flexible state management for React"
      />
      <meta name="og:title" content="Jotai 👻" />
    </>
  ),
}
