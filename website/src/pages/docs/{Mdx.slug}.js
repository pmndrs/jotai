import React from 'react'
import { graphql } from 'gatsby'
import { MDXRenderer } from 'gatsby-plugin-mdx'

import { Head, Layout, Jotai } from '../../components'

export default function DocsPage({ data }) {
  const { slug, frontmatter, body } = data.mdx
  const { title, description } = frontmatter

  return (
    <>
      <Head title={title} description={description} uri={slug} />
      <Layout showDocs>
        <div className="lg:hidden mb-4">
          <Jotai small />
        </div>
        <h1>{title}</h1>
        <MDXRenderer>{body}</MDXRenderer>
      </Layout>
    </>
  )
}

export const pageQuery = graphql`
  query PageQuery($slug: String) {
    mdx(slug: { eq: $slug }) {
      slug
      frontmatter {
        title
        description
      }
      body
    }
  }
`
