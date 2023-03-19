import './src/styles/index.css';
import { Layout } from './src/components/layout';

export { wrapRootElement } from './gatsby-shared';

export const wrapPageElement = ({ element, props }) => {
  return <Layout showDocs={props.path.startsWith('/docs')}>{element}</Layout>;
};
