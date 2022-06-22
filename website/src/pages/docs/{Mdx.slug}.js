import { graphql } from 'gatsby';
import { MDXRenderer } from 'gatsby-plugin-mdx';
import { Head, Jotai, Layout } from '../../components';

export default function DocsPage({ data }) {
  const { slug, frontmatter, body } = data.mdx;
  const { title, description } = frontmatter;
  const uri = `docs/${slug}`;

  return (
    <>
      <Head title={title} description={description} uri={uri} />
      <Layout showDocs>
        <div className="mb-4 lg:hidden">
          <Jotai isDocsPage small />
        </div>
        <h1>{title}</h1>
        <MDXRenderer>{body}</MDXRenderer>
      </Layout>
    </>
  );
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
`;
