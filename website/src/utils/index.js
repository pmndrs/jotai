import kebabCase from 'just-kebab-case';
import React from 'react';

const getTextContent = (children) => {
  let text = '';
  React.Children.toArray(children).forEach((child) => {
    if (typeof child === 'string') {
      text += child;
    } else if (React.isValidElement(child) && child.props.children) {
      text += getTextContent(child.props.children);
    }
  });
  return text;
};

export const getAnchor = (value) => {
  return kebabCase(getTextContent(value).toLowerCase().replaceAll("'", ''));
};
