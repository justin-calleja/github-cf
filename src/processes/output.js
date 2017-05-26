const csp = require('js-csp')
const { ActionMsg, FlushMsg } = require('../msgs')
const { outputCh } = require('../channels')

const SetProjectName = ActionMsg.SetProjectName
const AddContributor = ActionMsg.AddContributor
const AddFollower = ActionMsg.AddFollower

function outputReducer (state, msg) {
  if (SetProjectName.is(msg)) {
    return Object.assign({}, state, { projectName: msg.projectName })
  } else if (AddContributor.is(msg)) {
    let newState = Object.assign({}, state)
    newState.contributors[msg.contributor] = {
      html_url: msg.html_url,
      followers: {}
    }
    return newState
  } else if (AddFollower.is(msg)) {
    let newState = Object.assign({}, state)
    newState.contributors[msg.contributor].followers[msg.follower] = msg.html_url
    return newState
  }

  return state
}

function finalReducer (state) {
  let newState = Object.assign({}, state)
  let contributorNames = Object.keys(newState.contributors)
  newState.totalContributors = contributorNames.length
  contributorNames.forEach(name => {
    newState.contributors[name].totalFollowers = Object.keys(newState.contributors[name].followers).length
  })
  return newState
}

function * outputProcess () {
  let state = {
    projectName: '',
    contributors: {}
  }
  while (true) {
    const msg = yield csp.take(outputCh)
    if (ActionMsg.is(msg)) {
      state = outputReducer(state, msg)
    } else if (FlushMsg.is(msg)) {
      state = finalReducer(state)
      // NOTE: keep this the only console.log in the program:
      return console.log(JSON.stringify(state, null, 2))
    } else {
      console.error('WARNING: received unexpected message in outputCh. Message:', msg)
      return console.error('outputProcess shutting down...')
    }
  }
}

module.exports = outputProcess
