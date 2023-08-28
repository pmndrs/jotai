import kebabCase from 'just-kebab-case';

export const getAnchor = (value) => {
  return typeof value === 'string' ? kebabCase(value.toLowerCase().replaceAll("'", '')) : '';
};
