const path = require('path');

/** @type import('webpack').Configuration */
const conf = {
  entry: {
    index: './src/index.tsx',
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(graphql|gql)$/,
        exclude: /node_modules/,
        loader: 'graphql-tag/loader',
      },
    ],
  },
  devtool: 'inline-source-map',
  devServer: {
    hot: true,
    open: true,
    index: './index.html',
  },
};

module.exports = conf;
