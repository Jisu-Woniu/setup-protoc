import path from "node:path";
import { exit } from "node:process";

import { platform, setFailed, info, addPath, setOutput } from "@actions/core";
import { getOctokit } from "@actions/github";
import { cacheDir, downloadTool, extractZip, find } from "@actions/tool-cache";
import { satisfies } from "compare-versions";

import { maxByTagName } from "./utils";

// Auxiliary types from @actions/github
type Octokit = ReturnType<typeof getOctokit>;
type Release = Awaited<ReturnType<Octokit["rest"]["repos"]["getRelease"]>>["data"];
type ReleaseAsset = Release["assets"][number];

/**
 * Find the best matching release for the given version.
 *
 * @param version A semver version string or "latest" to get the latest release.
 * @param includePrereleases Whether to include prereleases in the search.
 * @param octokit An Octokit instance.
 * @returns The best matching release, or `undefined` if no release was found.
 */
const getRelease = async (version: string, includePrereleases: boolean, octokit: Octokit) => {
  if (!includePrereleases && version === "latest") {
    return (
      await octokit.rest.repos.getLatestRelease({ owner: "protocolbuffers", repo: "protobuf" })
    ).data;
  }

  const releases = (
    await octokit.rest.repos.listReleases({ owner: "protocolbuffers", repo: "protobuf" })
  ).data;

  if (version !== "latest") {
    return releases.find(
      ({ prerelease, tag_name }) =>
        (includePrereleases || !prerelease) && satisfies(tag_name, version),
    );
  } else {
    // Latest release or prerelease
    const latestId = (
      await octokit.rest.repos.getLatestRelease({ owner: "protocolbuffers", repo: "protobuf" })
    ).data.id;
    return maxByTagName(releases.filter(({ prerelease, id }) => prerelease || id === latestId));
  }
};

/**
 * Find the URL of the asset that matches the current platform and architecture.
 *
 * @param assets Assets list of a release
 * @returns The URL of the matching asset, will fail if no match was found.
 */
const getAssetUrl = (assets: ReleaseAsset[]) => {
  let nameFilter = null;

  switch (platform.platform) {
    case "linux":
      switch (platform.arch) {
        case "arm64":
          nameFilter = "linux-aarch_64";
          break;
        case "ia32":
          nameFilter = "linux-x86_32";
          break;
        case "ppc64":
          nameFilter = "linux-ppcle_64";
          break;
        case "s390x":
          nameFilter = "linux-s390_64";
          break;
        case "x64":
          nameFilter = "linux-x86_64";
          break;
        default:
          setFailed(`Unsupported architecture ${platform.arch}`);
          exit(1);
      }
      break;
    case "win32":
      switch (platform.arch) {
        case "ia32":
          nameFilter = "win32";
          break;
        case "x64":
          nameFilter = "win64";
          break;
        default:
          setFailed(`Unsupported architecture ${platform.arch}`);
          exit(1);
      }
      break;
    case "darwin":
      switch (platform.arch) {
        case "arm64":
          nameFilter = "osx-aarch_64";
          break;
        case "x64":
          nameFilter = "osx-x86_64";
          break;
        default:
          setFailed(`Unsupported architecture ${platform.arch}`);
          exit(1);
      }
      break;
    default:
      setFailed(`Unsupported platform ${platform.platform}`);
      exit(1);
  }
  const url = assets.find(
    ({ name }) => name.startsWith("protoc") && name.includes(nameFilter),
  )?.browser_download_url;

  if (!url) {
    setFailed(`No asset found for platform ${platform.platform} and architecture ${platform.arch}`);
    exit(1);
  }

  return url;
};

/**
 * Download the protoc binary for the given version.
 *
 * @param version A semver version string or "latest" to get the latest release.
 * @param includePrereleases Whether to include prereleases in the search.
 * @param githubToken A GitHub token to avoid rate limiting.
 * @returns The path to the downloaded protoc binary.
 */
export const downloadProtoc = async (
  version: string,
  includePrereleases: boolean,
  githubToken: string,
) => {
  const octokit = getOctokit(githubToken, { baseUrl: "https://api.github.com" });
  const release = await getRelease(version, includePrereleases, octokit);

  if (!release) {
    setFailed(`No release found for version ${version}`);
    exit(1);
  }

  const tagName = release.tag_name;

  info(`Found matching release ${tagName}`);
  info(`Checking local cache for protoc ${tagName}`);
  let cachedPath = find("protoc", tagName);

  if (!cachedPath) {
    info(`No cache found for protoc ${tagName}, downloading...`);

    const url = getAssetUrl(release.assets);
    const downloadPath = await downloadTool(url);

    const extractPath = await extractZip(downloadPath);
    cachedPath = await cacheDir(extractPath, "protoc", tagName);
  } else {
    info(`Found cached protoc ${tagName} in ${cachedPath}`);
  }

  addPath(path.join(cachedPath, "bin"));

  setOutput("version", tagName);
  setOutput("path", cachedPath);

  return;
};
