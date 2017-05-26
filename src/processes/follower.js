const csp = require('js-csp')
const parseLinkHeader = require('parse-link-header')
const { requestCh, outputCh } = require('../channels')
const { RequestMsg, ResponseMsg, ActionMsg } = require('../msgs')

const AddFollower = ActionMsg.AddFollower

function * followerProcess (uri, contributorLogin, ch) {
  yield csp.put(requestCh, RequestMsg(uri, ch))

  while (true) {
    const msg = yield csp.take(ch)
    if (ResponseMsg.is(msg)) {
      const { headers, json } = msg
      for (let i = 0; i < json.length; i++) {
        const follower = json[i]
        yield csp.put(outputCh, AddFollower(contributorLogin, follower.login, follower.html_url))
      }

      const parsedLinkHeader = parseLinkHeader(headers.link)
      if (parsedLinkHeader && parsedLinkHeader.next && parsedLinkHeader.next.url) {
        yield csp.put(requestCh, RequestMsg(parsedLinkHeader.next.url, ch))
      } else {
        return
      }
    } else {
      console.error('WARNING: received unexpected message in ch (from requestProcess). Message:', msg)
      return console.error(`followerProcess for ${contributorLogin} shutting down...`)
    }
  }
}

module.exports = followerProcess
