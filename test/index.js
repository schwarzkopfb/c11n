/**
 * Created by schwarzkopfb on 16/1/7.
 */

'use strict'

const assert = require('assert'),
      conf   = require('../'),
      opts   = {
          dirs: [ './', './env_spec' ],
          prefix: 'npm'
      }

process.env  = require('./env.json')
process.argv = require('./argv.json')

conf('./file', opts)
    .then((config) => {
        // successfully parsed, then
        // perform a 'black box' test on result
        // todo: add proper unit tests

        const expected = require('./parsed.json')
        assert.deepEqual(config, expected)
    })
    .catch((e) => {
        console.error(e.stack || e)
        process.exit(1)
    })
