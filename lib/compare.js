'use strict'

const semver = require('semver')

const fixSemver = s => {
  const segs = String(s).split('.')
  segs[0] = segs[0] || '0'
  segs[1] = segs[1] || '0'
  segs[2] = segs[2] || '0'
  return segs.join('.')
}

module.exports = (a, b) => {
  const aSemver = fixSemver(a.version)
  const bSemver = fixSemver(b.version)
  let ret

  if (semver.valid(aSemver) && semver.valid(bSemver)) {
    ret = semver.compare(aSemver, bSemver)
    if (ret === 0) return a.key.localeCompare(b.key)
    return ret
  }

  ret = a.version.localeCompare(b.version)
  if (ret === 0) return a.key.localeCompare(b.key)
  return ret
}

