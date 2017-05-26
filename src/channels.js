const csp = require('js-csp')

const channels = {
  requestCh: csp.chan(),
  contributorCh: csp.chan(),
  outputCh: csp.chan()
}

module.exports = channels
