#!/usr/bin/env node
'use strict'

const fs = require('fs')
const getRepo = require('get-pkg-repo')
const assert = require('assert')
const Travis = require('travis-ci')

const dir = process.argv[2] || '.'

const repo = getRepo(require(`${dir}/package.json`))
assert(repo.user)
assert(repo.project)

const travis = new Travis({ version: '2.0.0' })

travis
.repos(repo.user, repo.project)
.builds
.get((err, res) => {
  if (err) throw err
  console.log(res)
})
