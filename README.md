# Setup protoc

Download and install the Google Protocol Buffers `protoc` compiler and add it to the PATH for use in CI workflows.

This repository contains a GitHub Action (JavaScript) that locates a matching protoc release, downloads and caches it with @actions/tool-cache, and adds its `bin` directory to the runner PATH.

## Features

- Select a version (semver or `latest`)
- Optionally include GitHub prereleases when resolving
- Automatically picks the proper release asset for the runner platform/architecture
- Caches the extracted release with `actions/tool-cache` and updates PATH

## Inputs

- `version` - Version to use. Examples: `33`, `26.2`, `latest`. If the provided version starts with a digit the action will prefix it with `^` to perform semver matching. Default: `latest`.
- `include-pre-releases` - Whether to consider GitHub prereleases when resolving `latest`. Default: `false`.
- `github-token` - Token used to avoid rate limiting when calling the GitHub API. Default to `${{ github.token }}`.

## Example workflow

```yaml
name: CI
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - name: Setup protoc
        uses: Jisu-Woniu/setup-protoc@v1
        with:
          version: "33.0"
          include-pre-releases: "false"
          github-token: ${{ secrets.GITHUB_TOKEN }}
      - name: Show protoc
        run: protoc --version
```

## Developer / Contributing

This project is written in TypeScript and built with rolldown. To build the project, run:

```bash
pnpm install
pnpm build
```

This project is formatted with Oxfmt.

## License

Licensed under `MIT OR Apache-2.0`, see [LICENSE-MIT](./LICENSE-MIT) and [LICENSE-APACHE](./LICENSE-Apache-2.0) for details.

This project is inspired by [arduino/setup-protoc](https://github.com/arduino/setup-protoc), but is a complete rewrite. We aim to provide a more up-to-date implementation while keeping the compatibility with the original action.

Some code is adapted from [actions/typescript-action](https://github.com/actions/typescript-action).
