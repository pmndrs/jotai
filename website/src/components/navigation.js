import React, { useMemo } from 'react'
import cx from 'classnames'
import { useStaticQuery, graphql, Link } from 'gatsby'
import { useAtomValue, useUpdateAtom } from 'jotai/utils'

import { menuAtom, docsAtom } from '../atoms'
import { Button } from '../components'

export const Navigation = ({ isFooter = false, ...rest }) => {
  const data = useStaticQuery(staticQuery)

  const isDocsPage = useAtomValue(docsAtom)
  const setIsMenuOpen = useUpdateAtom(menuAtom)

  const allDocs = data.allMdx.nodes.sort(sortDocs)
  const navLinks = useMemo(() => parseDocs(allDocs), [allDocs, parseDocs])

  return (
    <nav {...rest}>
      {isDocsPage ? (
        <Button to="/" onClick={() => setIsMenuOpen(false)} icon="home">
          Home
        </Button>
      ) : (
        <Button
          to="/docs/introduction/"
          onClick={() => setIsMenuOpen(false)}
          icon="book">
          Documentation
        </Button>
      )}
      {!isFooter && isDocsPage && (
        <div className="space-y-8">
          {navLinks.map((section, index) => (
            <div key={index}>
              {section.title && (
                <div className="relative -left-0.5 font-bold text-gray-300 text-sm uppercase tracking-widest">
                  {section.title}
                </div>
              )}
              <ul className="mt-2 space-y-0.5">
                {section.contents.map((doc, index) => (
                  <li key={index}>
                    <Link
                      to={`/docs/${doc.slug}/`}
                      onClick={() => setIsMenuOpen(false)}
                      className="relative -left-3 inline-block px-2 py-1 border border-transparent hover:!border-gray-200 hover:bg-gray-100 rounded text-lg"
                      activeClassName="bg-blue-100 !border-blue-200"
                      partiallyActive>
                      {doc.meta.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <Button to="https://github.com/pmndrs/jotai" icon="github" external>
        Repository
      </Button>
      <Button to="https://www.npmjs.com/package/jotai" icon="npm" external>
        Package
      </Button>
      <Button
        to="https://egghead.io/courses/manage-application-state-with-jotai-atoms-2c3a29f0"
        icon="cap"
        external>
        Course
      </Button>
      <Button to="https://twitter.com/dai_shi" icon="twitter" external>
        Updates
      </Button>
    </nav>
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
