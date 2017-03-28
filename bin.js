#!/usr/bin/env node
'use strict'

const differ = require('ansi-diff-stream')
const render = require('render-ci-matrix')()
const resolve = require('path').resolve
const fs = require('fs')
const Watch = require('.')

const diff = differ()
diff.pipe(process.stdout)

const dir = resolve(process.argv[2] || '.')

try {
  fs.statSync(dir)
} catch (err) {
  console.error('Usage: travis-watch [DIRECTORY]')
  process.exit(1)
}

try {
  fs.statSync(`${dir}/.travis.yml`)
} catch (err) {
  console.error('Travis not set up. Skipping...')
  process.exit(0)
}

const watch = new Watch(dir)
watch.start()
watch.on('finish', () => {
  diff.reset()
  diff.write(render(watch.state))
  process.exit(!watch.state.success)
})

setInterval(
  () => {
    diff.reset() // FIXME
    diff.write(render(watch.state))
  },
  100
)
