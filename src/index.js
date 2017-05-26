const csp = require('js-csp')
const { outputCh, requestCh, contributorCh } = require('./channels')
const { ActionMsg, RequestMsg } = require('./msgs')
const { put } = require('./utils')

const requestProcess = require('./processes/request')
const contributorProcess = require('./processes/contributor')
const outputProcess = require('./processes/output')

const SetProjectName = ActionMsg.SetProjectName

function main (owner, repo, user, pass) {
  const projectName = `${owner}/${repo}`
  csp.go(requestProcess, [ user, pass ])
  csp.go(contributorProcess)
  csp.go(outputProcess)

  put(outputCh, SetProjectName(projectName))
  put(requestCh, RequestMsg(
    `https://api.github.com/repos/${projectName}/contributors`,
    contributorCh
  ))
}

module.exports = main
