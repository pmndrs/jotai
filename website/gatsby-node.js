exports.createPages = ({ actions }) => {
  const { createRedirect } = actions;

  actions.setWebpackConfig({
    module: {
      rules: [
        {
          test: require.resolve(`@gatsbyjs/reach-router/index`),
          type: `javascript/auto`,
          use: [
            {
              loader: require.resolve(`./reach-router`),
            },
          ],
        },
      ],
    },
  });

  createRedirect({
    fromPath: `/docs`,
    toPath: `/docs/introduction`,
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

  createRedirect({
    fromPath: `/docs/integrations/cache`,
    toPath: `/docs/extensions/cache`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/effect`,
    toPath: `/docs/extensions/effect`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/immer`,
    toPath: `/docs/extensions/immer`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/location`,
    toPath: `/docs/extensions/location`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/optics`,
    toPath: `/docs/extensions/optics`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/query`,
    toPath: `/docs/extensions/query`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/redux`,
    toPath: `/docs/extensions/redux`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/relay`,
    toPath: `/docs/extensions/relay`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/scope`,
    toPath: `/docs/extensions/scope`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/trpc`,
    toPath: `/docs/extensions/trpc`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/urql`,
    toPath: `/docs/extensions/urql`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/valtio`,
    toPath: `/docs/extensions/valtio`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/xstate`,
    toPath: `/docs/extensions/xstate`,
    isPermanent: false,
  });

  createRedirect({
    fromPath: `/docs/integrations/zustand`,
    toPath: `/docs/extensions/zustand`,
    isPermanent: false,
  });
};
