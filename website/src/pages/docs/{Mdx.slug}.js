import { graphql } from 'gatsby';
import { MDXRenderer } from 'gatsby-plugin-mdx';
import { Jotai } from '../../components/jotai.js';
import { Meta } from '../../components/meta.js';

export default function DocsPage({ data }) {
  const { frontmatter, body } = data.mdx;
  const { title } = frontmatter;

  return (
    <>
      <div className="mb-4 lg:hidden">
        <Jotai isDocsPage small />
      </div>
      <h1 className="-mt-1">{title}</h1>
      <div className="text-pretty">
        <MDXRenderer>{body}</MDXRenderer>
      </div>
    </>
  );
}

export const Head = ({ data }) => {
  const { slug, frontmatter } = data.mdx;
  const { title, description } = frontmatter;
  const uri = `docs/${slug}`;

  return <Meta title={title} description={description} uri={uri} />;
};

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
