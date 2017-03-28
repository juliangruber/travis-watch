'use strict'

const differ = require('ansi-diff-stream')
const compare = require('./compare')
const render = require('render-ci-matrix')()

let diff = differ()
diff.pipe(process.stdout)

module.exports = state => {
  sort(state, 'results')
  Object.keys(state.results).forEach(os => {
    sort(state.results, os, (a, b) =>
      compare(state.results[os][a], state.results[os][b]))
  })

  diff.reset() // FIXME
  diff.write(render(state))
}

// Sort the keys of object obj[key]
// with optional comparator
const sort = (obj, key, cmp) => {
  const keys = Object.keys(obj[key]).sort(cmp)
  const sorted = {}
  keys.forEach(_key => {
    sorted[_key] = obj[key][_key]
  })
  obj[key] = sorted
}
