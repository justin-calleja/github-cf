const csp = require('js-csp')
const request = require('request')
const { RequestMsg, ResponseMsg } = require('../msgs')
const { put } = require('../utils')
const { requestCh } = require('../channels')

function * requestProcess (user, pass) {
  while (true) {
    const msg = yield csp.take(requestCh)
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

module.exports = requestProcess
