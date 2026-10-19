import Highlight, { defaultProps } from 'prism-react-renderer'

export const Code = ({ language, className = '', children }) => {
  const code = children.trim()
  const codeLanguage =
    language ?? className.match(/\blanguage-(\S+)/)?.[1] ?? 'jsx'

  return (
    <Highlight
      {...defaultProps}
      language={codeLanguage}
      code={code}
      theme={undefined}
    >
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={`${className} notranslate`} style={style}>
          {tokens.map((line, i) => (
            <div {...getLineProps({ line, key: i })}>
              {line.map((token, key) => (
                <span {...getTokenProps({ token, key })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  )
}
