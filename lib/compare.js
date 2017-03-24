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
  const aSemver = fixSemver(a)
  const bSemver = fixSemver(b)
  if (semver.valid(aSemver) && semver.valid(bSemver)) {
    return semver.compare(aSemver, bSemver)
  }
  return a.localeCompare(b)
}

