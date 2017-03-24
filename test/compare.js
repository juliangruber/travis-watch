const { test } = require('tap')
const compare = require('../lib/compare')

test('compare', t => {
  t.deepEqual([
    'latest',
    '4',
    '0.12',
    '6.0.2',
    'node'
  ].sort(compare), [
    '0.12',
    '4',
    '6.0.2',
    'latest',
    'node'
  ])
  t.end()
})
