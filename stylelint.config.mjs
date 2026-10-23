export default {
  extends: ["stylelint-config-recommended-scss"],
  ignoreFiles: ["dist/**", "node_modules/**"],
  rules: {
    "scss/at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: ["custom-variant", "source", "theme", "utility", "variant"],
      },
    ],
    "selector-class-pattern": null,
  },
};
