import path from "node:path";
import { fileURLToPath } from "node:url";

import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import _import from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const eslintConfig = [
  {
    ignores: [
      "**/components/ui/**/*",
      "**/components/ui/**",
      "**/.next/**",
      "**/public/**",
      "**/node_modules/**",
    ],
  },
  ...fixupConfigRules(
    compat.extends(
      "next/core-web-vitals",
      "plugin:import/recommended",
      "plugin:import/typescript",
      "prettier",
    ),
  ),
  {
    plugins: {
      import: fixupPluginRules(_import),
      prettier,
    },

    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },

    rules: {
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "object",
            "type",
          ],

          "newlines-between": "always",

          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
    },
  },
];

export default eslintConfig;
