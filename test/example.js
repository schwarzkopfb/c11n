/**
 * Created by schwarzkopfb on 16/1/11.
 */

process.env = {
    my_app_domain: 'my-great-app.com',
    my_app_redis_auth: 'foobar',
    my_app_cookie_secret: 'foobar',
    my_app_cookie_maxAge: 365
}

process.argv = [
    'node',
    'example.js',
    '--cookie_secret=barfoo',
    '--http_port=8080'
]

const conf = require('../')

conf('./example', { prefix: 'my_app' })
    .then((config) => console.log(config))
    .catch((error) => console.error(error.stack || error))
