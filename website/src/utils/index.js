import React from 'react';
import kebabCase from 'just-kebab-case';

export const getAnchor = (value) => {
  if (React.isValidElement(value)) {
    const { children } = value.props;
    return kebabCase(children.toLowerCase().replaceAll("'", ''));
  } else if (typeof value === 'string') {
    return kebabCase(value.toLowerCase().replaceAll("'", ''));
  }
};
