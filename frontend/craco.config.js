/** CRA override: stop source-map-loader from parsing node_modules (react-router-dom). */
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.ignoreWarnings = [/Failed to parse source map/];

      const rules = webpackConfig.module?.rules;
      if (Array.isArray(rules)) {
        for (const rule of rules) {
          if (!rule.oneOf) continue;
          for (const oneOfRule of rule.oneOf) {
            const loader = oneOfRule.loader && String(oneOfRule.loader);
            if (loader && loader.includes('source-map-loader')) {
              oneOfRule.exclude = /node_modules/;
            }
          }
        }
      }

      return webpackConfig;
    },
  },
};
