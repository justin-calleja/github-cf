const csp = require('js-csp')

function put (ch, args) {
  csp.go(function * () {
    yield csp.put(ch, args)
  })
}

module.exports = {
  put
}
