#!/usr/bin/env node
'use strict'

const fs = require('fs')
const Travis = require('travis-ci')
const resolve = require('path').resolve
const getCommit = require('git-current-commit').sync
const gitRemoteOriginUrl = require('git-remote-origin-url')
const parseGitHubRepoUrl = require('parse-github-repo-url')
const render = require('./lib/render')

const dir = resolve(process.argv[2] || '.')

try {
  fs.statSync(dir)
} catch (err) {
  console.error('Usage: travis-watch [DIRECTORY]')
  process.exit(1)
}

try {
  fs.statSync(`${dir}/.travis.yml`)
} catch (err) {
  console.error('Travis not set up. Skipping...')
  process.exit(0)
}

const travis = new Travis({ version: '2.0.0' })

const state = {
  started: new Date(),
  commit: { sha: getCommit(dir) },
  repo: null,
  build: null,
  results: {},
  success: null
}

const getRepo = (dir, cb) => {
  if (state.repo) return cb()
  gitRemoteOriginUrl(dir)
    .then(url => {
      state.repo = parseGitHubRepoUrl(url)
      cb()
    })
    .catch(err => setImmediate(() => cb(err)))
}

const getBuilds = cb => {
  getRepo(dir, err => {
    if (err) return cb(err)
    travis
      .repos(state.repo[0], state.repo[1])
      .builds.get({ event_type: 'push' }, cb)
  })
}

const findCommit = commits => commits.find(c => c.sha === state.commit.sha)

const findBuild = (builds, commitId) =>
  builds.find(b => b.commit_id === commitId)

const getBuild = cb => {
  getBuilds((err, res) => {
    if (err) return cb(err)
    const commit = findCommit(res.commits)
    if (!commit) return setTimeout(() => getBuild(cb), 1000)
    state.commit = commit
    const build = findBuild(res.builds, commit.id)
    if (build) {
      state.build = build
      cb()
    } else {
      getBuild(cb)
    }
  })
}

const fixOSXBug = job => {
  if (
    job.config.os === 'osx' &&
    job.state === 'started' &&
    new Date(job.started_at) > new Date()
  ) {
    job.state = 'created'
  }
}

const getJob = (id, cb) => {
  travis.jobs(id).get((err, res) => {
    if (err) return cb(err)
    fixOSXBug(res.job)
    cb(null, res.job)
  })
}

const getJobKey = job => JSON.stringify(job.config)

const getLanguageVersion = job =>
  job.config.language === 'ruby'
    ? String(job.config.rvm)
    : job.config.language === 'android'
        ? '?'
        : String(job.config[job.config.language]) || '?'

getBuild(err => {
  if (err) throw err

  let todo = state.build.job_ids.length

  state.build.job_ids.forEach(jobId => {
    const check = (err, job) => {
      if (err) throw err
      job.version = getLanguageVersion(job)
      job.key = getJobKey(job)
      state.results[job.config.os] = state.results[job.config.os] || {}
      state.results[job.config.os][job.key] = job
      if (job.state === 'failed' && !job.allow_failure) state.success = false
      if (
        job.state === 'started' ||
        job.state === 'created' ||
        job.state === 'received' ||
        job.state === 'queued'
      ) {
        setTimeout(() => getJob(jobId, check), 1000)
      } else {
        if (!--todo) {
          if (typeof state.success !== 'boolean') state.success = true
          render(state)
          process.exit(!state.success)
        }
      }
    }
    getJob(jobId, check)
  })
})

setInterval(() => render(state), 100)
