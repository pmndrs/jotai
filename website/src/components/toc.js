import { Link, graphql, useStaticQuery } from 'gatsby';

export const TOC = ({ section = '' }) => {
  const data = useStaticQuery(staticQuery);

  const docs = data.allMdx.nodes.sort(sortDocs);
  const sectionLinks = parseDocs(docs, section);

  return (
    <section className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-3 md:text-base lg:grid-cols-5">
      {sectionLinks.map((sectionLink) => (
        <Link
          key={sectionLink.slug}
          to={`/docs/${sectionLink.slug}`}
          className="inline-flex aspect-video items-center justify-center rounded-md border border-gray-200 bg-gray-100 p-2  text-center leading-snug !text-black !no-underline hover:border-blue-200 hover:bg-blue-100 dark:border-gray-800 dark:bg-gray-900 dark:!text-gray-300 dark:hover:!border-teal-800 dark:hover:bg-teal-950 sm:rounded-lg sm:p-4"
        >
          {sectionLink.meta.title}
        </Link>
      ))}
    </section>
  );
};

const staticQuery = graphql`
  query {
    allMdx {
      nodes {
        slug
        meta: frontmatter {
          title
          nav
          published
        }
      }
    }
  }
`;

const sortDocs = (a, b) => a.meta.nav - b.meta.nav;

const parseDocs = (docs, section) => {
  let directories = [];
  let newDocs = [];

  docs.forEach(({ slug }) => {
    const hasParent = slug.includes('/');

    let parent = undefined;

    if (hasParent) {
      parent = slug.split('/')[0];

      if (!directories.includes(parent)) {
        directories = [...directories, parent];
      }
    }
  });

  newDocs = [{ contents: [...docs.filter((doc) => !doc.slug.includes('/'))] }];

  directories.forEach((directory) => {
    newDocs = [
      ...newDocs,
      {
        title: directory,
        contents: [
          ...docs.filter((doc) => doc.slug.startsWith(directory) && doc.meta.published !== false),
        ],
      },
    ];
  });

  newDocs = newDocs.find((docSection) => docSection.title === section).contents;

  return newDocs;
};
