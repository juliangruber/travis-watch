#!/usr/bin/env node
'use strict'

const fs = require('fs')
const getRepo = require('get-pkg-repo')
const assert = require('assert')
const Travis = require('travis-ci')
const exec = require('child_process').execSync
const ansi = require('ansi-escapes')

const dir = process.argv[2] || '.'

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
  process.stdout.write(ansi.eraseLines(lastLines))
  process.stdout.write(ansi.cursorPrevLine)
  process.stdout.write(ansi.eraseLine)
  lastLines = 0

  Object.keys(results).forEach(os => {
    const versions = Object.keys(results[os])
    if (!versions.length) return

    console.log()
    console.log(os)
    console.log()

    versions.forEach(version => {
      console.log(`  - node v${version}: ${check(results[os][version])}`)
    })

    console.log()

    lastLines += 4 + versions.length
  })
}

const check = bool => bool
  ? '✓'
  : '×'

console.log('...')
getBuild((err, build) => {
  if (err) throw err

  const results = {
    osx: {},
    linux: {}
  }

  build.job_ids.forEach(jobId => {
    const check = (err, job) => {
      if (err) throw err
      const passed = job.state === 'passed'
      results[job.config.os][job.config.node_js] = passed
      render(results)
      if (!passed) getJob(jobId, check)
    }
    getJob(jobId, check)
  })
})
