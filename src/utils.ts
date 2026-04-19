import assert from "node:assert";

import { trimStart, zip } from "es-toolkit";

/**
 * Split a string once at the first occurrence of a pattern.
 *
 * If the pattern is not found, returns the string and null.
 *
 * @param s The string to split.
 * @param pattern The pattern to split on.
 */
const splitOnce = (s: string, pattern: string): [string, string | null] => {
  const index = s.indexOf(pattern);
  if (index === -1) {
    return [s, null];
  }
  return [s.slice(0, index), s.slice(index + pattern.length)];
};

const VERSION_REGEX: Readonly<RegExp> = /^v?\d+(?:\.\d+)*(?:-\S*)?$/;

/**
 * Compares two version strings.
 *
 * @param tag1 The first version string.
 * @param tag2 The second version string.
 * @returns True if `tag1` is "less than" `tag2`, i.e., `tag1` is a lower version than `tag2`.
 */
const lt = (tag1: string, tag2: string): boolean => {
  assert(VERSION_REGEX.test(tag1));
  assert(VERSION_REGEX.test(tag2));
  // Trim leading "v" from tags
  tag1 = trimStart(tag1, "v");
  tag2 = trimStart(tag2, "v");

  // Split prerelease part (if any)
  const [v1, p1] = splitOnce(tag1, "-");
  const [v2, p2] = splitOnce(tag2, "-");

  if (v1 === v2) {
    // Suppose v1 === v2 === "1.0"
    // if p1 === null, then 1.0 >= 1.0*, false
    // else if p2 !== null, then 1.0-* < 1.0, true
    // else, both are prerelease, return p1 < p2
    return p1 !== null && (p2 === null || p1 < p2);
  }

  // Compare v1 and v2
  const seg1 = v1.split(".");
  const seg2 = v2.split(".");

  for (const [s1, s2] of zip(seg1, seg2)) {
    if (!s2) {
      // 1.0* >= 1.0
      return false;
    } else if (!s1) {
      // 1.0 < 1.0.*
      return true;
    } else {
      // Convert both to int
      const n1 = Number.parseInt(s1, 10);
      const n2 = Number.parseInt(s2, 10);
      if (n1 !== n2) {
        return n1 < n2;
      }
    }
  }

  // v1 === v2
  return false;
};

export const maxByTagName = <R extends { tag_name: string }>(releases: R[]): R | undefined => {
  if (releases.length <= 1) {
    return releases[0];
  }

  let max = releases[0];
  for (const version of releases) {
    if (lt(max.tag_name, version.tag_name)) {
      max = version;
    }
  }
  return max;
};
