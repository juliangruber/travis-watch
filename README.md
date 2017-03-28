
# travis-watch [![Build Status](https://travis-ci.org/juliangruber/travis-watch.svg?branch=master)](https://travis-ci.org/juliangruber/travis-watch) [![Greenkeeper badge](https://badges.greenkeeper.io/juliangruber/travis-watch.svg)](https://greenkeeper.io/)

Stream live travis test results of the current commit to your terminal. Exits with the proper exit code too!

![screenshot](screenshot.png)

## Installation

```bash
$ npm install -g travis-watch
```

## Usage

```bash
$ travis-watch --help
Usage: travis-watch [DIRECTORY]
```

## Supported build environments

- Node.js
- Ruby
- PHP
- Go
- Python

For more, please [open an issue](https://github.com/juliangruber/travis-watch/issues/new).

## Kudos

- Development of this module is sponsored by the [Dat Project](https://datproject.org/).
- Travis is :heart:

## Related

- __[ansi-diff-stream](https://github.com/mafintosh/ansi-diff-stream)__ &mdash; A transform stream that diffs input buffers and outputs the diff as ANSI. If you pipe this to a terminal it will update the output with minimal changes
- __[render-ci-matrix](https://github.com/juliangruber/render-ci-matrix)__ &mdash; Render a CI results matrix to the terminal.

## License

MIT
