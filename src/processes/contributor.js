const csp = require('js-csp')
const { ResponseMsg, ActionMsg, FlushMsg } = require('../msgs')
const { contributorCh, outputCh } = require('../channels')
const followerProcess = require('./follower')

const AddContributor = ActionMsg.AddContributor

function * contributorProcess () {
  const msg = yield csp.take(contributorCh)
  if (ResponseMsg.is(msg)) {
    const { json } = msg
    let doneChs = []
    for (let i = 0; i < json.length; i++) {
      const contributor = json[i]
      yield csp.put(outputCh, AddContributor(contributor.login, contributor.html_url))
      doneChs.push(
        csp.go(followerProcess, [contributor.followers_url, contributor.login, csp.chan()])
      )
    }

    for (let doneCh of doneChs) { yield doneCh }

    // all followerProcesses have ended
    return yield csp.put(outputCh, FlushMsg())
  } else {
    console.error('WARNING: received unexpected message in contributorCh. Message:', msg)
    console.error('contributorProcess shutting down...')
  }
}

module.exports = contributorProcess
