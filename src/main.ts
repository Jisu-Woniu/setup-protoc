import { getBooleanInput, getInput, setFailed } from "@actions/core";

import { downloadProtoc } from "./download";

try {
  let version = getInput("version") || "latest";
  if (/^[0-9]/.test(version)) version = `^${version}`;

  const includePrereleases = getBooleanInput("include-pre-releases");
  const githubToken = getInput("github-token");

  await downloadProtoc(version, includePrereleases, githubToken);
} catch (err) {
  setFailed(err instanceof Error ? (err.stack ?? err.message) : new Error(String(err)));
}
