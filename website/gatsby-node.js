const path = require('path');

exports.onCreateWebpackConfig = ({ actions }) => {
  actions.setWebpackConfig({
    resolve: {
      alias: {
        '~atoms': path.resolve(__dirname, 'src/atoms'),
        '~components': path.resolve(__dirname, 'src/components'),
      },
    },
  });
};
