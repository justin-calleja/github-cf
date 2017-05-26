const daggy = require('daggy')

const RequestMsg = daggy.tagged('RequestMsg', [ 'uri', 'successCh' ])
const ResponseMsg = daggy.tagged('ResponseMsg', [ 'headers', 'json' ])
const ActionMsg = daggy.taggedSum('ActionMsg', {
  SetProjectName: [ 'projectName' ],
  AddContributor: [ 'contributor', 'html_url' ],
  AddFollower: [ 'contributor', 'follower', 'html_url' ]
})
const FlushMsg = daggy.tagged('FlushMsg', [])

module.exports = {
  RequestMsg,
  ResponseMsg,
  ActionMsg,
  FlushMsg
}
