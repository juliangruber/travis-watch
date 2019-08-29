'use strict'

const Travis = require('travis-ci')
const getCommit = require('git-current-commit').sync
const EventEmitter = require('events')
const inherits = require('util').inherits
const sort = require('sort-keys')
const cmp = require('./lib/compare')
const canonical = require('gh-canonical-repository')

const travis = new Travis({ version: '2.0.0' })

module.exports = Watch
inherits(Watch, EventEmitter)

function Watch (dir) {
  if (!(this instanceof Watch)) return new Watch(dir)
  EventEmitter.call(this)

  this._dir = dir
  this.state = {
    started: new Date(),
    commit: {
      sha: getCommit(dir),
      found: false
    },
    link: null,
    repo: null,
    build: null,
    results: {},
    success: null
  }
}

Watch.prototype._getBuilds = function (cb) {
  const onrepo = (err, repo) => {
    if (err) return cb(err)
    this.state.repo = repo
    travis
      .repos(this.state.repo[0], this.state.repo[1])
      .builds.get({ event_type: 'push' }, cb)
  }

  if (this.state.repo) onrepo(null, this.state.repo)
  else canonical(this._dir, onrepo, onrepo)
}

Watch.prototype._findCommit = function (commits) {
  return commits.find(c => c.sha === this.state.commit.sha)
}

Watch.prototype._findBuild = function (builds) {
  return builds.find(b => b.commit_id === this.state.commit.id)
}

Watch.prototype._link = function () {
  return [
    'https://travis-ci.org',
    this.state.repo[0],
    this.state.repo[1],
    'builds',
    this.state.build.id
  ].join('/')
}

Watch.prototype._getBuild = function (cb) {
  this._getBuilds((err, res) => {
    if (err) return cb(err)
    if (!res.builds.length) return setTimeout(() => this._getBuild(cb), 500)
    const commit = this._findCommit(res.commits)
    if (!commit) return setTimeout(() => this._getBuild(cb), 1000)
    this.state.commit = {
      sha: commit.sha,
      id: commit.id,
      found: true,
      branch: commit.branch
    }
    const build = this._findBuild(res.builds)
    if (!build) return this._getBuild(cb)
    this.state.build = {
      id: build.id,
      number: build.number,
      startedAt: build.started_at,
      finishedAt: build.finished_at,
      job_ids: build.job_ids
    }
    this.state.link = this._link()
    cb()
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

const getLanguageVersion = job => {
  if (job.config.language === 'ruby') {
    return String(job.config.rvm)
  } else if (
    job.config[job.config.language] &&
    job.config.language !== 'android'
  ) {
    return String(job.config[job.config.language])
  } else {
    return '?'
  }
}

Watch.prototype.start = function () {
  this._getBuild(err => {
    if (err) return this.emit('error', err)

    let todo = this.state.build.job_ids.length

    this.state.build.job_ids.forEach(jobId => {
      const check = (err, job) => {
        if (err) return this.emit('error', err)
        job.version = getLanguageVersion(job)
        job.name = `${job.config.language}: ${job.version}`
        job.key = getJobKey(job)
        job.env = job.config.env
        job.startedAt = job.started_at
        job.allowFailure = job.allow_failure
        if (!this.state.results[job.config.os]) {
          this.state.results[job.config.os] = {}
          this.state.results = sort(this.state.results)
        }
        if (this.state.results[job.config.os][job.key]) {
          this.state.results[job.config.os][job.key] = job
        } else {
          this.state.results[job.config.os][job.key] = job
          Object.keys(this.state.results).forEach(os => {
            this.state.results[os] = sort(this.state.results[os], (a, b) =>
              cmp(this.state.results[os][a], this.state.results[os][b])
            )
          })
        }
        if (job.state === 'failed' && !job.allow_failure) {
          this.state.success = false
        }
        if (
          job.state === 'started' ||
          job.state === 'created' ||
          job.state === 'received' ||
          job.state === 'queued'
        ) {
          setTimeout(() => getJob(jobId, check), 1000)
        } else {
          if (!--todo) {
            if (typeof this.state.success !== 'boolean') {
              this.state.success = true
            }
            this.emit('finish')
          }
        }
      }
      getJob(jobId, check)
    })
  })
}
