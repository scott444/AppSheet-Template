const path = require("path");
const fs = require("fs");
const { DefinePlugin } = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const { VueLoaderPlugin } = require("vue-loader");

const APPSCRIPT = path.resolve(__dirname, "appscript");
const DIST = path.resolve(APPSCRIPT, "dist");

module.exports = {
  mode: "production",
  performance: { hints: false },  // SheetJS adds ~350KB; acceptable for single-user internal tool
  entry: path.resolve(APPSCRIPT, "ui/main.js"),
  output: {
    path: DIST,
    filename: "_vue-app.js",
    clean: true,
    // Apps Script HtmlService (Caja sanitizer) cannot handle ES6+ in inline <script> tags.
    // Force ES5 output so template literals, arrow functions, etc. are transpiled.
    environment: {
      arrowFunction: false,
      const: false,
      destructuring: false,
      forOf: false,
      templateLiteral: false,
    },
  },

  optimization: {
    minimizer: [
      new (require("terser-webpack-plugin"))({
        terserOptions: {
          ecma: 5,
          output: { ecma: 5 },
        },
      }),
    ],
  },

  resolve: {
    alias: { vue$: "vue/dist/vue.runtime.esm-bundler.js" },
    extensions: [".js", ".vue"],
  },

  module: {
    rules: [
      { test: /\.vue$/, loader: "vue-loader" },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
      // Transpile all JS (including Vue runtime from node_modules) to ES5.
      // Apps Script HtmlService (Caja sanitizer) breaks on template literals in inline <script>.
      {
        test: /\.js$/,
        loader: "babel-loader",
        options: {
          presets: [["@babel/preset-env", { targets: { ie: "11" } }]],
        },
      },
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

    // After webpack emits the Vue bundle, build the Apps Script HTML files.
    // Instead of inlining everything into one index.html (which can exceed
    // HtmlService's ~500KB Caja-sanitized limit), we split into separate
    // .html files and use <?!= include('filename') ?> server-side includes.
    {
      apply(compiler) {
        compiler.hooks.afterEmit.tap("BuildAppsScriptHtml", () => {
          // 1. Copy styles.html into dist as-is
          const styles = fs.readFileSync(
            path.resolve(APPSCRIPT, "styles.html"),
            "utf8"
          );
          fs.writeFileSync(path.resolve(DIST, "styles.html"), styles);

          // 2. Wrap the JS bundle in <script> tags and save as vue-app.html
          const bundle = fs.readFileSync(
            path.resolve(DIST, "_vue-app.js"),
            "utf8"
          );
          fs.writeFileSync(
            path.resolve(DIST, "vue-app.html"),
            "<script>\n" + bundle + "\n</" + "script>"
          );

          // 3. Build index.html with server-side includes
          const template = fs.readFileSync(
            path.resolve(APPSCRIPT, "index.html"),
            "utf8"
          );
          const html = template
            .replace("<!-- INJECT:STYLES -->", "<?!= include('styles') ?>")
            .replace("<!-- INJECT:VUEBUNDLE -->", "<?!= include('vue-app') ?>");
          fs.writeFileSync(path.resolve(DIST, "index.html"), html);

          // 4. Clean up standalone JS bundle and license
          fs.unlinkSync(path.resolve(DIST, "_vue-app.js"));
          const license = path.resolve(DIST, "_vue-app.js.LICENSE.txt");
          if (fs.existsSync(license)) fs.unlinkSync(license);
        });
      },
    },
  ],
};
