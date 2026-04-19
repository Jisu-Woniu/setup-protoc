/** @type {import("nano-staged").Configuration} */
export default {
  "*.{js,ts,json}": () => ["oxfmt", "pnpm build"],
};
