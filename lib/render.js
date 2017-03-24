const spinners = require('cli-spinners')
const chalk = require('chalk')
const differ = require('ansi-diff-stream')
const compare = require('./compare')
const ms = require('ms')

let diff = differ()
diff.pipe(process.stdout)
let frameIdx = 0

module.exports = state => {
  let out = ''

  const frame = spinners.dots.frames[frameIdx]
  frameIdx = (frameIdx + 1) % spinners.dots.frames.length

  if (!state.repo) return diff.write(`${chalk.gray(frame)} Loading repo`)

  if (!state.build) return diff.write(out + `${chalk.gray(frame)} Loading build`)

  out += `\n${chalk.bold('Build')} #${state.build.number}`
  out += ` ${chalk.gray.bold(`${state.repo[0]}/${state.repo[1]}`)} ${chalk.gray(`#${state.commit.branch}`)}`
  out += `\n${chalk.blue.underline(`https://travis-ci.org/${state.repo[0]}/${state.repo[1]}/builds/${state.build.id}`)}\n\n`

  if (!Object.keys(state.results).length) return diff.write(out + `  ${chalk.gray(frame)} Loading jobs`)
  diff.reset()

  Object.keys(state.results).forEach((os, i, arr) => {
    const versions = Object.keys(state.results[os]).sort(compare)

    if (arr.length > 1) out += `${chalk.gray(os)}\n`

    versions.forEach(version => {
      const job = state.results[os][version]
      out += `  ${check(job.state, spinners.dots.frames[frameIdx])} ${getJobLanguage(job)} ${version}`
      if (job.state === 'started') {
        out += ` ${chalk.white(`(${ms(new Date() - new Date(job.started_at))})`)}`
      }
      out += '\n'
    })

    out += '\n'
  })

  diff.write(out)
}

const check = (state, frame) => {
  const out = state === 'failed'
    ? chalk.red('×')
    : state === 'passed'
        ? chalk.green('✓')
        : state === 'started' ? chalk.yellow(frame) : chalk.gray(frame)
  return out
}

const getJobLanguage = job =>
  job.config.node_js ? 'node' : job.config.php ? 'php' : '?'
