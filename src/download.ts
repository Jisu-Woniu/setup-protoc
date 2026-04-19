import { exit } from "node:process";

import { platform, setFailed, info, addPath } from "@actions/core";
import { getOctokit } from "@actions/github";
import { cacheDir, downloadTool, extractZip, find } from "@actions/tool-cache";
import { satisfies } from "compare-versions";

import { maxByTagName } from "./utils";

type Octokit = ReturnType<typeof getOctokit>;
type Release = Awaited<ReturnType<Octokit["rest"]["repos"]["getRelease"]>>["data"];
type ReleaseAsset = Release["assets"][number];

const getRelease = async (
  version: string,
  includePrereleases: boolean,
  octokit: ReturnType<typeof getOctokit>,
) => {
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

  info(`Found matching release ${release.tag_name}`);

  info(`Checking local cache for protoc ${release.tag_name}`);
  let cachedPath = find("protoc", release.tag_name);

  if (!cachedPath) {
    info(`No cache found for protoc ${release.tag_name}, downloading...`);

    const url = getAssetUrl(release.assets);
    const downloadPath = await downloadTool(url);

    const extractPath = await extractZip(downloadPath);
    cachedPath = await cacheDir(extractPath, "protoc", release.tag_name);
  }

  addPath(`${cachedPath}/bin`);

  return;
};
