
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

## JavaScript API

```js
const differ = require('ansi-diff-stream')
const render = require('render-ci-matrix')()
const Watch = require('travis-watch')

const diff = differ()
diff.pipe(process.stdout)

const watch = new Watch(process.cwd())
watch.start()

setInterval(
  () => diff.write(render(watch.state)),
  100
)

watch.on('finish', () => {
  diff.write(render(watch.state))
  process.exit(!watch.state.success)
})
```

## Kudos

- Development of this module is sponsored by the [Dat Project](https://datproject.org/).
- Travis is :heart:

## Related

- __[appveyor-watch](https://github.com/juliangruber/appveyor-watch)__ &mdash; Stream live AppVeyor test results of the current commit to your terminal!
- __[ansi-diff-stream](https://github.com/mafintosh/ansi-diff-stream)__ &mdash; A transform stream that diffs input buffers and outputs the diff as ANSI. If you pipe this to a terminal it will update the output with minimal changes
- __[render-ci-matrix](https://github.com/juliangruber/render-ci-matrix)__ &mdash; Render a CI results matrix to the terminal.

## License

MIT
