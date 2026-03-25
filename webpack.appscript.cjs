const path = require("path");
const fs = require("fs");
const { DefinePlugin } = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const { VueLoaderPlugin } = require("vue-loader");

const APPSCRIPT = path.resolve(__dirname, "appscript");
const DIST = path.resolve(APPSCRIPT, "dist");

module.exports = {
  mode: "production",
  entry: path.resolve(APPSCRIPT, "ui/main.js"),
  output: {
    path: DIST,
    filename: "_vue-app.js",
    clean: true,
  },

  resolve: {
    alias: { vue$: "vue/dist/vue.runtime.esm-bundler.js" },
    extensions: [".js", ".vue"],
  },

  module: {
    rules: [
      { test: /\.vue$/, loader: "vue-loader" },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
    ],
  },

  plugins: [
    new DefinePlugin({
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    }),

    new VueLoaderPlugin(),

    new CopyPlugin({
      patterns: [
        // Apps Script server-side JS (copied as-is, not bundled or minified)
        {
          from: "appscript/src/*.js",
          to: ({ absoluteFilename }) => path.basename(absoluteFilename),
          info: { minimized: true }, // tell webpack it's already "minimized" so it won't touch it
        },

        // Apps Script manifest
        { from: "appscript/appsscript.json", to: "appsscript.json" },
      ],
    }),

    // After webpack emits the Vue bundle, inline it into index.html
    {
      apply(compiler) {
        compiler.hooks.afterEmit.tap("InlineVueBundle", () => {
          const styles = fs.readFileSync(
            path.resolve(APPSCRIPT, "styles.html"),
            "utf8"
          );
          const bundle = fs.readFileSync(
            path.resolve(DIST, "_vue-app.js"),
            "utf8"
          );
          const template = fs.readFileSync(
            path.resolve(APPSCRIPT, "index.html"),
            "utf8"
          );

          const html = template
            .replace("<!-- INJECT:STYLES -->", styles)
            .replace(
              "<!-- INJECT:VUEBUNDLE -->",
              "<script>" + bundle + "</" + "script>"
            );

          fs.writeFileSync(path.resolve(DIST, "index.html"), html);

          // Remove the standalone JS bundle and license — now inlined
          fs.unlinkSync(path.resolve(DIST, "_vue-app.js"));
          const license = path.resolve(DIST, "_vue-app.js.LICENSE.txt");
          if (fs.existsSync(license)) fs.unlinkSync(license);
        });
      },
    },
  ],
};
