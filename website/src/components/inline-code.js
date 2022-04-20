export const InlineCode = ({ children }) => {
  return (
    <code className="relative -top-px px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-black dark:text-gray-400">
      {children}
    </code>
  )
}
