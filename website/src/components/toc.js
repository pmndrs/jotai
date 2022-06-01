import cx from 'classnames'
import { Link, graphql, useStaticQuery } from 'gatsby'

export const TOC = ({ section = '' }) => {
  const data = useStaticQuery(staticQuery)

  const docs = data.allMdx.nodes.sort(sortDocs)
  const sectionLinks = parseDocs(docs, section)

  const sectionClassNames = cx(
    'mt-4 grid gap-4',
    sectionLinks.length <= 16
      ? 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 text-sm'
  )

  return (
    <section className={sectionClassNames}>
      {sectionLinks.map((sectionLink) => (
        <Link
          to={`/docs/${sectionLink.slug}`}
          className="inline-flex justify-center items-center p-2 border rounded-md sm:rounded-lg border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 hover:bg-blue-100 !text-black dark:!text-gray-300 text-center leading-snug aspect-video !no-underline">
          {sectionLink.meta.title}
        </Link>
      ))}
    </section>
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
          published
        }
      }
    }
  }
`

const sortDocs = (a, b) => a.meta.nav - b.meta.nav

const parseDocs = (docs, section) => {
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
        title: directory,
        contents: [
          ...docs.filter(
            (doc) =>
              doc.slug.startsWith(directory) &&
              doc.slug !== 'api/utils' &&
              doc.meta.published !== false
          ),
        ],
      },
    ]
  })

  newDocs = newDocs.find((docSection) => docSection.title === section).contents

  return newDocs
}
