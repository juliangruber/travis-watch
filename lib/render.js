'use strict'

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

  if (!state.commit.id) return diff.write(out + `${chalk.gray(frame)} Looking for commit`)

  let header = `\n${chalk.bold('Build')} #${state.build.number}`
  if (typeof state.success === 'boolean') {
    header = state.success
      ? chalk.green(header)
      : chalk.red(header)
  }

  out += header
  out += ` ${chalk.gray.bold(`${state.repo[0]}/${state.repo[1]}`)} ${chalk.gray(`#${state.commit.branch}`)}`
  out += `\n${chalk.blue.underline(`https://travis-ci.org/${state.repo[0]}/${state.repo[1]}/builds/${state.build.id}`)}\n\n`

  if (!Object.keys(state.results).length) return diff.write(out + `  ${chalk.gray(frame)} Loading jobs`)
  diff.reset()

  Object.keys(state.results).sort().forEach((os, i, arr) => {
    const keys = Object.keys(state.results[os])
      .sort((a, b) => compare(state.results[os][a], state.results[os][b]))

    if (arr.length > 1) out += `${chalk.gray(os)}\n`

    keys.forEach(key => {
      const job = state.results[os][key]
      out += `  ${check(job, spinners.dots.frames[frameIdx])} ${job.config.language}: ${job.version} ${chalk.gray(job.config.env || '')}`
      if (job.state === 'started') {
        out += ` ${chalk.white(`(${ms(new Date() - new Date(job.started_at))})`)}`
      }
      out += '\n'
    })

    out += '\n'
  })

  diff.write(out)
}

const check = (job, frame) => {
  const out = job.state === 'failed' && !job.allow_failure
    ? chalk.red('×')
    : job.state === 'failed' && job.allow_failure
    ? chalk.gray('×')
    : job.state === 'passed'
        ? chalk.green('✓')
        : job.state === 'started' ? chalk.yellow(frame) : chalk.gray(frame)
  return out
}
