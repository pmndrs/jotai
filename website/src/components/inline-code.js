export const InlineCode = ({ children }) => {
  return (
    <code className="relative -top-px rounded bg-gray-100 px-1 py-0.5 text-black dark:bg-gray-900 dark:text-gray-400">
      {children}
    </code>
  );
};
