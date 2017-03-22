#!/usr/bin/env node
'use strict'

const fs = require('fs')
const getRepo = require('get-pkg-repo')
const assert = require('assert')
const Travis = require('travis-ci')
const exec = require('child_process').execSync
const ansi = require('ansi-escapes')
const ora = require('ora')
const chalk = require('chalk')
const resolve = require('path').resolve
const ms = require('ms')

const dir = resolve(process.argv[2] || '.')

const repo = getRepo(require(`${dir}/package.json`))
assert(repo.user)
assert(repo.project)

const sha = exec('git log --format="%H" -n1', {
  cwd: dir
}).toString().trim()

const travis = new Travis({ version: '2.0.0' })

const getBuilds = cb => {
  travis
  .repos(repo.user, repo.project)
  .builds
  .get(cb)
}

const findCommit = commits => commits.find(c => c.sha === sha)
const findBuild = (builds, commitId) => builds.find(b => b.commit_id === commitId)

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
  travis
  .jobs(id)
  .get((err, res) => {
    if (err) return cb(err)
    cb(null, res.job)
  })
}

let lastLines = 0
const render = results => {
  let first = true

  Object.keys(results).forEach(os => {
    const versions = Object.keys(results[os])
    if (!versions.length) return

    if (first) {
      spinner.stop()
      process.stdout.write(ansi.eraseLines(lastLines))
      if (lastLines) {
        process.stdout.write(ansi.cursorPrevLine)
        process.stdout.write(ansi.eraseLine)
      }
      lastLines = 0
      first = false
    }

    console.log()
    console.log(chalk.gray(os))
    console.log()

    versions.forEach(version => {
      const job = results[os][version]
      process.stdout.write(`  ${check(job.state)} node ${version}`)
      if (job.state === 'started') {
        process.stdout.write(` ${chalk.white(`(${ms(new Date() - new Date(job.started_at))})`)}`)
      }
      process.stdout.write('\n')
    })

    console.log()

    lastLines += 4 + versions.length
  })
}

const check = state =>
  state === 'failed' ? chalk.red('×')
  : state === 'passed' ? chalk.green('✓')
  : chalk.yellow('.')

const spinner = ora('Loading build').start()

getBuild((err, build) => {
  if (err) throw err

  const results = {
    osx: {},
    linux: {}
  }

  spinner.text = 'Loading jobs'

  build.job_ids.forEach(jobId => {
    const check = (err, job) => {
      if (err) throw err
      results[job.config.os][job.config.node_js] = job
      render(results)
      if (job.state === 'started' || job.state === 'created') {
        getJob(jobId, check)
      }
    }
    getJob(jobId, check)
  })
})
