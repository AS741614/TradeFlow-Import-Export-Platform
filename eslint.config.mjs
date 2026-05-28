import js from "@eslint/js";
import path from "path";
import { fileURLToPath } from "url";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import nextConfig from "eslint-config-next/core-web-vitals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract the jsx-a11y plugin instance from Next's config to prevent "Cannot redefine plugin" error
const nextJsxA11yPlugin = nextConfig.find(
  (cfg) => cfg.plugins && cfg.plugins["jsx-a11y"]
)?.plugins?.["jsx-a11y"];

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
      "eslint.config.mjs",
      "coverage/**",
      "scripts/**",
      "drizzle/**",
      "*.ts",
      "*.js",
      "*.mjs"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
  },
  ...nextConfig,
  {
    ...jsxA11y.flatConfigs.strict,
    plugins: {
      "jsx-a11y": nextJsxA11yPlugin || jsxA11y,
    },
    rules: {
      "@typescript-eslint/no-confusing-void-expression": "off"
    }
  },
);
