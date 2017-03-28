'use strict'

const differ = require('ansi-diff-stream')
const cmp = require('./compare')
const render = require('render-ci-matrix')()
const sort = require('sort-keys')

let diff = differ()
diff.pipe(process.stdout)

module.exports = state => {
  state.results = sort(state.results)
  Object.keys(state.results).forEach(os => {
    state.results[os] = sort(state.results[os], (a, b) =>
      cmp(state.results[os][a], state.results[os][b]))
  })

  diff.reset() // FIXME
  diff.write(render(state))
}
