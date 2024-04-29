# Contributing

## Reporting Issues

If you have found what you think is a bug, please [start a discussion](https://github.com/pmndrs/jotai/discussions/new).

Also for usage questions, please [start a discussion](https://github.com/pmndrs/jotai/discussions/new).

## Suggesting new features

If you are here to suggest a feature, first [start a discussion](https://github.com/pmndrs/jotai/discussions/new) if it does not already exist. From there, we will discuss use-cases for the feature and then finally discuss how it could be implemented.

## Development guide

If you would like to contribute by fixing an open issue or developing a new feature you can use this suggested workflow:

### General

1. Fork this repository
2. Create a new feature branch based off the `main` branch
3. Follow the [Core lib](#core-lib) and/or the [docs](#docs) guide below and come back to this once done
4. Run `yarn run prettier` to format the code
5. Git stage your required changes and commit (review the commit guidelines below)
6. Submit the PR for review

### Core lib

1. Enable [Corepack](https://nodejs.org/api/corepack.html) by running `corepack enable`, and install the dependencies by running `yarn install`
2. Create failing tests for your fix or new feature in the `tests` folder
3. Implement your changes
4. Build the library `yarn run build` _(Pro-tip: `yarn run build-watch` runs the build in watch mode)_
5. Run the tests and ensure that they pass. _(Pro-tip: `yarn test:dev` runs the test in watch mode)_
6. You can use `yarn link` or `yalc` to sym-link this package and test it locally on your own project. Alternatively, you may use CodeSandbox CI's canary releases to test the changes in your own project (requires a PR to be created first)
7. Follow step 4 and onwards from the [general](#general) guide above to bring it to the finish line

### Docs

1. Navigate to the `website` folder. Eg. `cd website`
2. Install dependencies by running `yarn` in the `website` folder We use [version 1](https://classic.yarnpkg.com/lang/en/docs/install) of yarn
3. Run `yarn dev` to start the dev server
4. Navigate to [`http://localhost:9000`](http://localhost:9000) to view the docs
5. Navigate to the `docs` folder and make necessary changes to the docs
6. Add your changes to the docs and see them live reloaded in the browser
7. Follow step 4 and onwards from the [general](#general) guide above to bring it to the finish line

### Type

We follow the [conventional commit spec](https://www.conventionalcommits.org/en/v1.0.0/) for our commit messages. Please review the spec for more details.

Your commit type must be one of the following:

- **build**: Changes that affect the build system or external dependencies (example scopes: yarn, npm, rollup, etc.)
- **ci**: Changes to our CI configuration files and scripts (example scopes: GitHub Actions)
- **docs**: Documentation only changes
- **feat**: A new feature
- **fix**: A bug fix
- **perf**: A code change that improves performance
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **test**: Adding missing tests or correcting existing tests

## Pull requests

Please try to keep your pull request focused in scope and avoid including unrelated commits.

After you have submitted your pull request, we'll try to get back to you as soon as possible. We may suggest some changes or request improvements, therefore, please check ✅ ["Allow edits from maintainers"](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork) on your PR

Thank you for contributing!
