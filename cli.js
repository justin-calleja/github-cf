#!/usr/bin/env node

const meow = require('meow')
const main = require('./src')

const cli = meow(`
  Usage
    $ github-cf

  Options
    -o, --owner   The repo's owner on Github (default: ubolonton)
    -r, --repo    The repo on Github (default: js-csp)
    -u, --user    Your Github username
    -p, --pass    Your Github password
`, {
  alias: {
    o: 'owner',
    r: 'repo',
    u: 'user',
    p: 'pass'
  }
})

let user = cli.flags.u
if (!user) {
  console.error('Your Github username is required')
} else {
  main(
    cli.flags.o || 'ubolonton',
    cli.flags.r || 'js-csp',
    cli.flags.u,
    cli.flags.p || process.env.GITHUB_PASS
  )
}
