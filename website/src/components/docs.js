import cx from 'classnames';
import { Link, graphql, useStaticQuery } from 'gatsby';
import { useSetAtom } from 'jotai';
import { menuAtom } from '../atoms';
import { Icon } from '../components/icon';

export const Docs = ({ className = '', ...rest }) => {
  const data = useStaticQuery(staticQuery);

  const setIsMenuOpen = useSetAtom(menuAtom);

  const allDocs = data.allMdx.nodes.filter(checkDocs).sort(sortDocs);
  const navLinks = parseDocs(allDocs);

  return (
    <div className={cx('my-8 space-y-8', className)} {...rest}>
      {navLinks.map((section) => (
        <div className="space-y-2">
          {section.title && (
            <div className="relative -left-0.5 flex items-center gap-1.5">
              <span className="text-base font-bold uppercase tracking-widest text-gray-350 dark:text-gray-650">
                {section.title}
              </span>
              <span className="relative top-px">
                <Icon icon="chevron" className="h-auto w-4 text-gray-350" />
              </span>
            </div>
          )}
          <ul className="space-y-0.5">
            {section.contents.map((doc, index) => (
              <li key={index}>
                <Link
                  to={`/docs/${doc.slug}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="relative -left-3 inline-block whitespace-nowrap rounded border border-transparent px-2 py-1 text-base hover:!border-blue-200 hover:bg-blue-100 dark:hover:!border-teal-800 dark:hover:bg-teal-950"
                  activeClassName="!border-blue-200 dark:!border-teal-900 bg-blue-100 dark:bg-teal-950"
                  partiallyActive
                >
                  {doc.meta.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
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

const checkDocs = (doc) => doc.meta?.nav !== null && doc.meta.published !== false;

const sortDocs = (a, b) => a.meta.nav - b.meta.nav;

const parseDocs = (docs) => {
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
        title: directory.replace('-', ' '),
        contents: [...docs.filter((doc) => doc.slug.startsWith(directory))],
      },
    ];
  });

  return newDocs;
};
