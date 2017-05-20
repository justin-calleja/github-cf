const csp = require('js-csp')
const request = require('request')
const parseLinkHeader = require('parse-link-header')
const daggy = require('daggy')

const RequestMsg = daggy.tagged('RequestMsg', [ 'uri', 'successCh' ])
const ResponseMsg = daggy.tagged('ResponseMsg', [ 'headers', 'json' ])
const ActionMsg = daggy.taggedSum('ActionMsg', {
  SetProjectName: [ 'projectName' ],
  AddContributor: [ 'contributor', 'html_url' ],
  AddFollower: [ 'contributor', 'follower', 'html_url' ]
})
const FlushMsg = daggy.tagged('FlushMsg', [])

const channels = {
  requestCh: csp.chan(),
  contributorCh: csp.chan(),
  outputCh: csp.chan()
}

function main (owner, repo, user, pass) {
  const projectName = `${owner}/${repo}`
  csp.go(requestProcess, [ user, pass ])
  csp.go(contributorProcess)
  csp.go(outputProcess)

  put(channels.outputCh, ActionMsg.SetProjectName(projectName))
  put(channels.requestCh, RequestMsg(
    `https://api.github.com/repos/${projectName}/contributors`,
    channels.contributorCh
  ))
}

function put (ch, args) {
  csp.go(function * () {
    yield csp.put(ch, args)
  })
}

function * requestProcess (user, pass) {
  while (true) {
    const msg = yield csp.take(channels.requestCh)
    if (RequestMsg.is(msg)) {
      const { uri, successCh } = msg
      request({
        method: 'GET',
        uri,
        headers: { 'User-Agent': 'request' },
        auth: { user, pass }
      }, (err, res, body) => {
        if (err) {
          return console.error(`Error making request to ${uri}. Message:`, err.message)
        }
        let json = null
        try {
          json = JSON.parse(body)
          if (json.message) {
            // Probably API rate limit exceeded...
            return console.error(json.message)
          }
        } catch (err) {
          return console.error(`Error parsing JSON`, err.message)
        }

        put(successCh, ResponseMsg(res.headers, json))
      })
    } else {
      console.error('WARNING: received unexpected message in requestCh. Message:', msg)
    }
  }
}

function * contributorProcess () {
  const msg = yield csp.take(channels.contributorCh)
  if (ResponseMsg.is(msg)) {
    const { json } = msg
    for (let i = 0; i < json.length; i++) {
      const contributor = json[i]
      yield csp.put(channels.outputCh, ActionMsg.AddContributor(contributor.login, contributor.html_url))
      const doneCh = csp.go(followerProcess, [contributor.followers_url, contributor.login, csp.chan()])
      yield csp.take(doneCh)
    }
    return yield csp.put(channels.outputCh, FlushMsg())
  } else {
    console.error('WARNING: received unexpected message in contributorCh. Message:', msg)
    console.error('contributorProcess shutting down...')
  }
}

function * followerProcess (uri, contributorLogin, ch) {
  yield csp.put(channels.requestCh, RequestMsg(uri, ch))

  while (true) {
    const msg = yield csp.take(ch)
    if (ResponseMsg.is(msg)) {
      const { headers, json } = msg
      for (let i = 0; i < json.length; i++) {
        const follower = json[i]
        yield csp.put(channels.outputCh, ActionMsg.AddFollower(contributorLogin, follower.login, follower.html_url))
      }

      const parsedLinkHeader = parseLinkHeader(headers.link)
      if (parsedLinkHeader && parsedLinkHeader.next && parsedLinkHeader.next.url) {
        yield csp.put(channels.requestCh, RequestMsg(parsedLinkHeader.next.url, ch))
      } else {
        return
      }
    } else {
      console.error('WARNING: received unexpected message in ch (from requestProcess). Message:', msg)
      return console.error(`followerProcess for ${contributorLogin} shutting down...`)
    }
  }
}

function outputReducer (state, msg) {
  if (ActionMsg.SetProjectName.is(msg)) {
    return Object.assign({}, state, { projectName: msg.projectName })
  } else if (ActionMsg.AddContributor.is(msg)) {
    let newState = Object.assign({}, state)
    newState.contributors[msg.contributor] = {
      html_url: msg.html_url,
      followers: {}
    }
    return newState
  } else if (ActionMsg.AddFollower.is(msg)) {
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
    const msg = yield csp.take(channels.outputCh)
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

module.exports = main
