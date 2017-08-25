const path = require('path');

module.exports = {
  context: path.join(__dirname, 'src'),
  entry: [
    './main.js',
  ],
  node: {
    fs: "empty"
  },
  output: {
    path: path.join(__dirname, 'www'),
    filename: 'bundle.js',
    library: 'BundleEntry', // Let non-bundled client JS can access Auth class.
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          'babel-loader',
        ],
      },
    ],
  },
  resolve: {
    modules: [
      path.join(__dirname, 'node_modules'),
    ],
  },
};
