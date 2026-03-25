const path = require("path");
const fs = require("fs");
const CopyPlugin = require("copy-webpack-plugin");

const APPSCRIPT = path.resolve(__dirname, "appscript");
const DIST = path.resolve(APPSCRIPT, "dist");

module.exports = {
  mode: "production",
  entry: path.resolve(APPSCRIPT, "build-entry.js"),
  output: {
    path: DIST,
    filename: "_entry.js",
    clean: true,
  },
  optimization: { minimize: false },

  plugins: [
    new CopyPlugin({
      patterns: [
        // Apps Script source files
        { from: "appscript/src/*.js", to: ({ absoluteFilename }) => path.basename(absoluteFilename) },

        // Apps Script manifest
        { from: "appscript/appsscript.json", to: "appsscript.json" },

        // index.html — inline styles.html at the build marker
        {
          from: "appscript/index.html",
          to: "index.html",
          transform(content) {
            const styles = fs.readFileSync(path.resolve(APPSCRIPT, "styles.html"), "utf8");
            return content.toString().replace("<!-- INJECT:STYLES -->", styles);
          },
        },
      ],
    }),

    // Remove the dummy entry output
    {
      apply(compiler) {
        compiler.hooks.afterEmit.tap("CleanEntry", () => {
          const entry = path.resolve(DIST, "_entry.js");
          if (fs.existsSync(entry)) fs.unlinkSync(entry);
        });
      },
    },
  ],
};
