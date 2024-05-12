import { Children, isValidElement } from 'react';
import kebabCase from 'just-kebab-case';

export const getAnchor = (value) => {
  return kebabCase(getTextContent(value).toLowerCase().replaceAll("'", ''));
};

const getTextContent = (children) => {
  let text = '';

  Children.toArray(children).forEach((child) => {
    if (typeof child === 'string') {
      text += child;
    } else if (isValidElement(child) && child.props.children) {
      text += getTextContent(child.props.children);
    }
  });

  return text;
};
