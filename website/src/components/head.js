import React from 'react'
import { useStaticQuery, graphql } from 'gatsby'
import { Helmet } from 'react-helmet'

export const Head = ({ lang = 'en', title, description, uri }) => {
  const data = useStaticQuery(staticQuery)
  const { gatsby } = data

  const htmlAttributes = {
    lang: lang,
  }

  const siteTitle = gatsby.meta.title
  const siteDescription = gatsby.meta.description
  const siteIcon = '/favicon.svg'
  const socialMediaCardImage = '/preview_DRAFT.png'

  return (
    <Helmet htmlAttributes={htmlAttributes} defer={false}>
      <title>{siteTitle}</title>
      <meta property="description" content={siteDescription} />
      <meta property="og:locale" content={lang} />
      <meta property="og:site_name" content="👻 Jotai" />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={socialMediaCardImage} />
      <meta property="og:image:url" content={socialMediaCardImage} />
      <meta property="og:image:secure_url" content={socialMediaCardImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="twitter:card" content="summary_large_image" />
      <link rel="icon" type="image/svg+xml" href={siteIcon} />
    </Helmet>
  )
}

const staticQuery = graphql`
  query {
    gatsby: site {
      meta: siteMetadata {
        title
        description
        siteUrl
      }
    }
  }
`
