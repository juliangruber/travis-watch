'use strict'

const Travis = require('travis-ci')
const getCommit = require('git-current-commit').sync
const gitRemoteOriginUrl = require('git-remote-origin-url')
const parseGitHubRepoUrl = require('parse-github-repo-url')
const EventEmitter = require('events')
const inherits = require('util').inherits
const sort = require('sort-keys')
const cmp = require('./lib/compare')
const got = require('got')

const travis = new Travis({ version: '2.0.0' })

module.exports = Watch
inherits(Watch, EventEmitter)

function Watch (dir) {
  if (!(this instanceof Watch)) return new Watch(dir)
  EventEmitter.call(this)

  this._dir = dir
  this.state = {
    started: new Date(),
    commit: { sha: getCommit(dir) },
    link: null,
    repo: null,
    build: null,
    results: {},
    success: null
  }
}

Watch.prototype._getRepo = function () {
  return gitRemoteOriginUrl(this._dir)
    .then(url => {
      this.state.repo = parseGitHubRepoUrl(url)
      this._getCanonicalRepo()
    })
}

Watch.prototype._getCanonicalRepo = function () {
  const url = `api.github.com/repos/${this.state.repo[0]}/${this.state.repo[1]}`
  return got(url, { json: true })
    .then(res => {
      this.state.repo = res.body.full_name.split('/')
    })
}

Watch.prototype._getBuilds = function (cb) {
  return this._getRepo()
    .then(() => {
      const d = Deferred()
      travis
        .repos(this.state.repo[0], this.state.repo[1])
        .builds.get({ event_type: 'push' }, d.cb)
      return d
    })
}

Watch.prototype._findCommit = function (commits) {
  return commits.find(c => c.sha === this.state.commit.sha)
}

Watch.prototype._findBuild = function (builds) {
  return builds.find(b => b.commit_id === this.state.commit.id)
}

Watch.prototype._link = function () {
  return `https://travis-ci.org/${this.state.repo[0]}/${this.state.repo[1]}/builds/${this.state.build.id}`
}

Watch.prototype._getBuild = function () {
  return this._getBuilds().then(res => {
    if (!res.builds.length) return this._getBuild() // TODO sleep
    const commit = this._findCommit(res.commits)
    if (!commit) return this._getBuild()
    this.state.commit = commit
    const build = this._findBuild(res.builds)
    if (!build) return this._getBuild()
    this.state.build = build
    this.state.link = this._link()
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
  return job
}

const getJob = (id, cb) => {
  const d = deferred()
  travis.jobs(id).get(d.cb)
  return d.then(job => fixOSXBug(job))
}

const getJobKey = job => JSON.stringify(job.config)

const getLanguageVersion = job =>
  job.config.language === 'ruby'
    ? String(job.config.rvm)
    : job.config.language === 'android'
        ? '?'
        : String(job.config[job.config.language]) || '?'

Watch.prototype.start = function () {
  return this._getBuild().then(() => {
    let todo = this.state.build.job_ids.length

    this.state.build.job_ids.forEach(jobId => {
      const check = (err, job) => {
        if (err) return this.emit('error', err)
        job.version = getLanguageVersion(job)
        job.key = getJobKey(job)
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
              cmp(this.state.results[os][a], this.state.results[os][b]))
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
