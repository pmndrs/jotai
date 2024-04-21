import { getAnchor } from '../utils/index.js';

function parseMarkdownHeader(text) {
  console.log('text', text);
  if (typeof text !== 'string') {
    return text;
  }
  // 使用正则表达式匹配标题和描点
  const match = text.match(/(.*) {#(.*)}/);

  let title, anchorRaw;
  if (match) {
    title = match[1]; // 标题
    anchorRaw = match[2]; // 描点
  } else {
    title = text; // 如果没有描点，整个文本就是标题
    anchorRaw = text;
  }

  return { title, anchorRaw };
}

export const H2 = ({ children }) => {
  const { title, anchorRaw } = parseMarkdownHeader(children);
  const anchor = getAnchor(anchorRaw);
  const link = `#${anchor}`;

  return (
    <h2 id={anchor}>
      <a href={link}>{title}</a>
    </h2>
  );
};

export const H3 = ({ children }) => {
  const { title, anchorRaw } = parseMarkdownHeader(children);
  const anchor = getAnchor(anchorRaw);
  const link = `#${anchor}`;

  return (
    <h3 id={anchor}>
      <a href={link}>{title}</a>
    </h3>
  );
};

export const H4 = ({ children }) => {
  const { title, anchorRaw } = parseMarkdownHeader(children);
  const anchor = getAnchor(anchorRaw);
  const link = `#${anchor}`;

  return (
    <h4 id={anchor}>
      <a href={link}>{title}</a>
    </h4>
  );
};

export const H5 = ({ children }) => {
  const { title, anchorRaw } = parseMarkdownHeader(children);
  const anchor = getAnchor(anchorRaw);
  const link = `#${anchor}`;

  return (
    <h5 id={anchor}>
      <a href={link}>{title}</a>
    </h5>
  );
};

export const A = ({ href, children, ...rest }) => {
  if (href.startsWith('http')) {
    return (
      <a href={href} target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    );
  }

  const newHref = href.replace('.mdx', '');

  return (
    <a href={newHref} {...rest}>
      {children}
    </a>
  );
};
