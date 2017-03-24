const semver = require('semver')

const compare = (a, b) => {
  const aSemver = fixSemver(a)
  const bSemver = fixSemver(b)
  if (semver.valid(aSemver) && semver.valid(bSemver)) {
    return semver.compare(aSemver, bSemver)
  }
  return a.localeCompare(b)
}

