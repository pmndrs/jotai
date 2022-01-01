export const H2 = ({ children }) => {
  const anchor = getAnchor(children)
  const link = `#${anchor}`

  return (
    <h2 id={anchor}>
      <a href={link}>{children}</a>
    </h2>
  )
}

export const H3 = ({ children }) => {
  const anchor = getAnchor(children)
  const link = `#${anchor}`

  return (
    <h3 id={anchor}>
      <a href={link}>{children}</a>
    </h3>
  )
}

export const H4 = ({ children }) => {
  const anchor = getAnchor(children)
  const link = `#${anchor}`

  return (
    <h4 id={anchor}>
      <a href={link}>{children}</a>
    </h4>
  )
}

export const H5 = ({ children }) => {
  const anchor = getAnchor(children)
  const link = `#${anchor}`

  return (
    <h5 id={anchor}>
      <a href={link}>{children}</a>
    </h5>
  )
}

export const A = ({ href, children, ...rest }) => {
  const newHref = href.replace('.mdx', '')

  return (
    <a href={newHref} {...rest}>
      {children}
    </a>
  )
}

const getAnchor = (value) => {
  return typeof value === 'string'
    ? value
        .replace(/ /g, '-')
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase()
    : ''
}
