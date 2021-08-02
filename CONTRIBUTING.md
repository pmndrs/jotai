# Contributing

## Reporting Issues

If you have found what you think is a bug, please [file an issue](https://github.com/pmndrs/jotai/issues/new).

For usage questions, prefer [starting a discussion](https://github.com/pmndrs/jotai/discussions/new).

## Suggesting new features

If you are here to suggest a feature, first create an issue if it does not already exist. From there, we will discuss use-cases for the feature and then finally discuss how it could be implemented.

## Development

If you would like to contribute by fixing an open issue or developing a new feature you can use this suggested workflow:

- Fork this repository.
- Create a new feature branch based off the `master` branch.
- Install dependencies by running `$ yarn`.
- Create failing tests for your fix or new feature.
- Implement your changes and confirm that all test are passing. You can run the tests continuously during development via the `$ yarn test:dev` command.
- If you want to test it in a React project you can either use `$ yarn link` or `yalc` package.
- Git stage your required changes and commit (see below commit guidelines).
- Submit PR for review.

### Type

Must be one of the following:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **test**: Adding missing or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries such as documentation
  generation

## Pull requests

Please try to keep your pull request focused in scope and avoid including unrelated commits.

After you have submitted your pull request, we'll try to get back to you as soon as possible. We may suggest some changes or improvements.

Thank you for contributing!
