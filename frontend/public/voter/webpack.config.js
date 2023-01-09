const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const DIST = path.resolve(__dirname, "dist");

module.exports = {
  mode: "development",
  entry: "./main.js",
  output: {
    filename: "bundle.js",
    path: DIST,
    publicPath: DIST,
  },
  devServer: {
    contentBase: DIST,
    port: 9011,
    writeToDisk: true,
  },
  devtool: "eval-cheap-source-map",
  plugins: [
    new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),

    // for build scripts
    new CopyPlugin({
      patterns: [
        {
          flatten: true,
          from: "./*",
          to: ".",
          globOptions: {
            ignore: ["**/*.js", "**/*.json"],
          },
        },
      ],
    }),
  ],
};
