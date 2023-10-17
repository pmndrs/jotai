exports.createPages = ({ actions }) => {
  const { createRedirect } = actions;

  createRedirect({
    fromPath: `/docs`,
    toPath: `/docs/introduction`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/*`,
    toPath: `/docs/utilities/*`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/advanced-recipes/*`,
    toPath: `/docs/recipes/*`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/api/babel`,
    toPath: `/docs/tools/babel`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/api/core`,
    toPath: `/docs/core/atom`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/api/devtools`,
    toPath: `/docs/tools/devtools`,
    isPermanent: false,
  });
  createRedirect({
    fromPath: `/docs/api/devtools`,
    toPath: `/docs/tools/devtools`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/api/swc`,
    toPath: `/docs/tools/swc`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/api/utils`,
    toPath: `/docs/tools/introduction`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/atom-family`,
    toPath: `/docs/utilities/family`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/atom-with-default`,
    toPath: `/docs/utilities/resettable`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/atom-with-hash`,
    toPath: `/docs/extensions/location`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/atom-with-observable`,
    toPath: `/docs/utilities/async`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/*`,
    toPath: `/docs/extensions/*`,
    isPermanent: true,
  });

  createRedirect({
    fromPath: `/docs/utils/atom-with-reducer`,
    toPath: `/docs/utilities/reducer`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/atom-with-reset`,
    toPath: `/docs/utilities/resettable`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/atom-with-storage`,
    toPath: `/docs/utilities/storage`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/freeze-atom-creator`,
    toPath: `/docs/tools/devtools`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/freeze-atom`,
    toPath: `/docs/tools/devtools`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/loadable`,
    toPath: `/docs/utilities/async`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/reset`,
    toPath: `/docs/utilities/resettable`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/select-atom`,
    toPath: `/docs/utilities/select`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/split-atom`,
    toPath: `/docs/utilities/split`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/use-atom-callback`,
    toPath: `/docs/utilities/callback`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/use-atom-value`,
    toPath: `/docs/core/use-atom`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/use-hydrate-atoms`,
    toPath: `/docs/utilities/ssr`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/use-reducer-atom`,
    toPath: `/docs/utilities/reducer`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/use-reset-atom`,
    toPath: `/docs/utilities/resttable`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/utils/use-update-atom`,
    toPath: `/docs/core/use-atom`,
    isPermanent: false,
  });
};
