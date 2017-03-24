const test = require('tap').test
const compare = require('../lib/compare')

test('compare', t => {
  t.deepEqual(
    [
      { version: 'latest' },
      { version: '4' },
      { version: '0.12' },
      { version: '6.0.2' },
      { version: 'node' }
    ].sort(compare),
    [
      { version: '0.12' },
      { version: '4' },
      { version: '6.0.2' },
      { version: 'latest' },
      { version: 'node' }
    ]
  )
  t.end()
})
