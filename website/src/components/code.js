import React from 'react';
import Highlight, { defaultProps } from 'prism-react-renderer';

export const Code = ({ code }) => {
  return (
    <Highlight {...defaultProps} language="jsx" code={code} theme={undefined}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={className} style={style}>
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
  );
};
