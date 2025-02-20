export const ExternalLink = ({ to, children, ...rest }) => {
  return (
    <a href={to} target="_blank" rel="noreferrer" {...rest}>
      {children}
    </a>
  )
}
