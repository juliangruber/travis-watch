#!/usr/bin/env node
'use strict'

const fs = require('fs')
const Travis = require('travis-ci')
const ora = require('ora')
const chalk = require('chalk')
const resolve = require('path').resolve
const ms = require('ms')
const spinners = require('cli-spinners')
const differ = require('ansi-diff-stream')
const compare = require('./lib/compare')
const getCommit = require('git-current-commit').sync
const gitRemoteOriginUrl = require('git-remote-origin-url')
const parseGitHubRepoUrl = require('parse-github-repo-url')

const dir = resolve(process.argv[2] || '.')

const sha = getCommit(dir)
const travis = new Travis({ version: '2.0.0' })

let repo

const getRepo = (dir, cb) => {
  if (repo) return cb(null, repo)
  gitRemoteOriginUrl(dir).then(url => {
    repo = parseGitHubRepoUrl(url)
    cb(null, repo)
  })
}

const getBuilds = cb => {
  getRepo(dir, (err, repo) => {
    if (err) return cb(err)
    travis.repos(repo[0], repo[1]).builds.get({ event_type: 'push' }, cb)
  })
}

const findCommit = commits => commits.find(c => c.sha === sha)
const findBuild = (builds, commitId) =>
  builds.find(b => b.commit_id === commitId)

const getBuild = cb => {
  getBuilds((err, res) => {
    if (err) return cb(err)
    const commit = findCommit(res.commits)
    if (!commit) return getBuild(cb)
    const build = findBuild(res.builds, commit.id)
    if (build) cb(null, build)
    else getBuild(cb)
  })
}

const getJob = (id, cb) => {
  travis.jobs(id).get((err, res) => {
    if (err) return cb(err)
    cb(null, res.job)
  })
}

let diff = differ()
diff.pipe(process.stdout)
let frameIdx = 0

const render = () => {
  let out = ''

  Object.keys(results).forEach((os, i, arr) => {
    const versions = Object.keys(results[os]).sort(compare)
    spinner.stop()

    if (i === 0) out += '\n'
    if (arr.length > 1) out += `${chalk.gray(os)}\n`

    versions.forEach(version => {
      const job = results[os][version]
      out += `  ${check(job.state, spinners.dots.frames[frameIdx])} ${getJobLanguage(job)} ${version}`
      if (job.state === 'started') {
        out += ` ${chalk.white(`(${ms(new Date() - new Date(job.started_at))})`)}`
      }
      out += '\n'
    })

    out += '\n'
  })

  frameIdx = (frameIdx + 1) % spinners.dots.frames.length

  diff.write(out)
}

const results = {}

setInterval(render, 100)

const check = (state, frame) => {
  const out = state === 'failed'
    ? chalk.red('×')
    : state === 'passed'
        ? chalk.green('✓')
        : state === 'started' ? chalk.yellow(frame) : chalk.gray(frame)
  return out
}

const spinner = ora('Loading build').start()

const getJobLanguage = job =>
  job.config.node_js ? 'node' : job.config.php ? 'php' : '?'
const getJobKey = job => job.config.node_js || job.config.php

getBuild((err, build) => {
  if (err) throw err

  spinner.text = 'Loading jobs'
  let todo = build.job_ids.length
  let exitCode = 0

  build.job_ids.forEach(jobId => {
    const check = (err, job) => {
      if (err) throw err
      results[job.config.os] = results[job.config.os] || {}
      results[job.config.os][getJobKey(job)] = job
      if (job.state === 'failed') exitCode = 1
      if (job.state === 'started' || job.state === 'created') {
        getJob(jobId, check)
      } else {
        if (!--todo) {
          render()
          process.exit(exitCode)
        }
      }
    }
    getJob(jobId, check)
  })
})
