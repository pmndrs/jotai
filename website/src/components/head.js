import React from 'react'
import { useStaticQuery, graphql } from 'gatsby'
import { Helmet } from 'react-helmet'

export const Head = ({ lang = 'en', title, description, uri }) => {
  const data = useStaticQuery(staticQuery)

  const { gatsby } = data

  const htmlAttributes = {
    lang,
  }

  const siteTitle = gatsby.meta.title
  const siteUrl = gatsby.meta.siteUrl
  const siteIcon = `${siteUrl}/favicon.svg`
  const socialMediaCardImage = `${siteUrl}/preview_DRAFT.png`
  const shortName = gatsby.meta.shortName

  const pageTitle = title ? `${title} — ${siteTitle}` : siteTitle
  const pageDescription = description ?? gatsby.meta.description
  const pageUrl = uri ? `${siteUrl}/${uri}/` : siteUrl

  return (
    <Helmet htmlAttributes={htmlAttributes} defer={false}>
      <title>{pageTitle}</title>
      <meta property="description" content={pageDescription} />
      <meta property="og:locale" content={lang} />
      <meta property="og:site_name" content={shortName} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={socialMediaCardImage} />
      <meta property="og:image:url" content={socialMediaCardImage} />
      <meta property="og:image:secure_url" content={socialMediaCardImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="twitter:card" content="summary_large_image" />
      <link rel="icon" type="image/svg+xml" href={siteIcon} />
      <link rel="canonical" href={pageUrl} />
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
        shortName
      }
    }
  }
`
