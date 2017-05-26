const csp = require('js-csp')
const { ResponseMsg, ActionMsg, FlushMsg } = require('../msgs')
const { contributorCh, outputCh } = require('../channels')
const followerProcess = require('./follower')

const AddContributor = ActionMsg.AddContributor

function * contributorProcess () {
  const msg = yield csp.take(contributorCh)
  if (ResponseMsg.is(msg)) {
    const { json } = msg
    for (let i = 0; i < json.length; i++) {
      const contributor = json[i]
      yield csp.put(outputCh, AddContributor(contributor.login, contributor.html_url))
      const doneCh = csp.go(followerProcess, [contributor.followers_url, contributor.login, csp.chan()])
      yield csp.take(doneCh)
    }
    return yield csp.put(outputCh, FlushMsg())
  } else {
    console.error('WARNING: received unexpected message in contributorCh. Message:', msg)
    console.error('contributorProcess shutting down...')
  }
}

module.exports = contributorProcess
