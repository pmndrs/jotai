import { Link, graphql, useStaticQuery } from 'gatsby'
import { useSetAtom } from 'jotai'
import { menuAtom } from '../atoms/index.js'
import { Icon } from '../components/icon.js'

export const Docs = (props) => {
  const data = useStaticQuery(staticQuery)
  const setIsMenuOpen = useSetAtom(menuAtom)

  const allDocs = data.allMdx.nodes.filter(checkDocs).sort(sortDocs)
  const allNavLinks = parseDocs(allDocs)
  const navLinks = allNavLinks.slice(1)

  const renderSection = (section, index) => (
    <div key={section.title || index}>
      {section.title && (
        <div className="relative -left-0.5 flex items-center gap-1 mt-8 lg:mt-0">
          <span className="text-base font-bold uppercase tracking-widest text-gray-350 dark:text-white">
            {section.title}
          </span>
          <span className="relative top-px">
            <Icon icon="chevron" className="h-auto w-4 text-gray-350" />
          </span>
        </div>
      )}
      <ul className="space-y-0.5 mt-2">
        {section.contents.map((doc) => (
          <li key={doc.slug}>
            <Link
              to={`/docs/${doc.slug}`}
              onClick={() => setIsMenuOpen(false)}
              className="relative -left-3 inline-block whitespace-nowrap rounded border dark:!border-none border-transparent px-2 py-1 text-base text-black hover:!border-blue-200 hover:bg-blue-100 dark:text-gray-300 dark:hover:!text-black dark:hover:bg-white lg:whitespace-normal"
              activeClassName="!border-blue-200 dark:!border-white bg-blue-100 dark:bg-white dark:!text-black"
            >
              {doc.meta.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )

  const renderGroupedSections = () => {
    const totalSections = navLinks.length
    const groupsCount = Math.floor((totalSections - 2) / 2)
    const result = []

    for (let i = 0; i < groupsCount; i++) {
      const startIndex = i * 2
      result.push(
        <section
          key={`group-${i}`}
          className="contents lg:flex lg:flex-col lg:gap-8"
        >
          {renderSection(navLinks[startIndex], startIndex)}
          {renderSection(navLinks[startIndex + 1], startIndex + 1)}
        </section>,
      )
    }

    const remainingStart = groupsCount * 2

    for (let i = remainingStart; i < totalSections; i++) {
      result.push(renderSection(navLinks[i], i))
    }

    return result
  }

  return <div {...props}>{renderGroupedSections()}</div>
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
