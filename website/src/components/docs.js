import cx from 'classnames'
import { Link, graphql, useStaticQuery } from 'gatsby'
import { useUpdateAtom } from 'jotai/utils'
import { menuAtom } from '../atoms'

export const Docs = ({ className = '', ...rest }) => {
  const data = useStaticQuery(staticQuery)

  const setIsMenuOpen = useUpdateAtom(menuAtom)

  const allDocs = data.allMdx.nodes.filter(checkDocs).sort(sortDocs)
  const navLinks = parseDocs(allDocs)

  return (
    <div className={cx('space-y-8', className)} {...rest}>
      {navLinks.map((section, index) => (
        <div key={index}>
          {section.title && (
            <div className="relative -left-0.5 font-bold text-gray-350 dark:text-gray-650 text-sm uppercase tracking-widest">
              {section.title}
            </div>
          )}
          <ul className="mt-2 space-y-0.5">
            {section.contents.map((doc, index) => (
              <li key={index}>
                <Link
                  to={`/docs/${doc.slug}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="relative -left-3 inline-block px-2 py-1 border border-transparent hover:!border-blue-200 dark:hover:!border-teal-800 hover:bg-blue-100 dark:hover:bg-teal-950 rounded text-lg"
                  activeClassName="!border-blue-200 dark:!border-teal-900 bg-blue-100 dark:bg-teal-950"
                  partiallyActive>
                  {doc.meta.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

const staticQuery = graphql`
  query {
    allMdx {
      nodes {
        slug
        meta: frontmatter {
          title
          nav
        }
      }
    }
  }
`

const checkDocs = (doc) => doc.meta?.nav !== null

const sortDocs = (a, b) => a.meta.nav - b.meta.nav

const parseDocs = (docs) => {
  let directories = []
  let newDocs = []

  docs.forEach(({ slug }) => {
    const hasParent = slug.includes('/')

    let parent = undefined

    if (hasParent) {
      parent = slug.split('/')[0]

      if (!directories.includes(parent)) {
        directories = [...directories, parent]
      }
    }
  })

  newDocs = [{ contents: [...docs.filter((doc) => !doc.slug.includes('/'))] }]

  directories.forEach((directory) => {
    newDocs = [
      ...newDocs,
      {
        title: directory.replace('-', ' '),
        contents: [...docs.filter((doc) => doc.slug.startsWith(directory))],
      },
    ]
  })

  return newDocs
}
