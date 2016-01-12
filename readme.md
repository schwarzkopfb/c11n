[![view on npm](http://img.shields.io/npm/v/c11n.svg)](https://www.npmjs.com/package/c11n)
[![npm module downloads per month](http://img.shields.io/npm/dm/c11n.svg)](https://www.npmjs.com/package/c11n)
[![Build Status](https://travis-ci.org/schwarzkopfb/c11n.svg?branch=master)](https://travis-ci.org/schwarzkopfb/c11n)

# c11n

## What's `c11n`?

`c11n` is a dead simple configuration loader and parser for node deployments.  
It outputs an object that encapsulates unified configuration settings from 
environment variables, json files and command line arguments.

## Usage

Let's consider we have an `example.json` file with the following content:

```json
{
    "redis": { 
        "host": "redis.my-great-app.com",
        "port": 6379
    },

    "facebook": {
        "id": 123456789,
        "key": "myfacebookapikey"
    } 
}
```

Drop a few lines into `index.js`:

```js
const conf = require('c11n')

conf('./example', { prefix: 'my_app' })
    .then((config) => console.log(config))
    .catch((error) => console.error(error.stack || error))
```

Finally, expose settings to `env` and `argv` as well and run our app:

```bash
export my_app_domain=my-great-app.com
export my_app_redis_auth=foobar
export my_app_cookie_secret=foobar
export my_app_cookie_maxAge=365

node ./ --cookie_secret=barfoo --http_port=8080
```

Output:

```js
{ 
  domain: 'my-great-app.com',
  redis: { 
    auth: 'foobar', 
    host: 'redis.my-great-app.com', 
    port: 6379 
  },
  cookie: { 
    secret: 'barfoo', 
    maxage: 365 
  },
  facebook: { 
    id: 123456789, 
    key: 'myfacebookapikey' 
  },
  http: { port: 8080 } 
}

```

## API

```js
var c11n = require('c11n')
```

### c11n([filePaths...], [options], [callback]) ⇒ Promise

_options.prefix_: Include only those `env` variables which are starting with this prefix. Defaults to `null`. 
_options.dir_: Directory path to try to find and include `NODE_ENV`.json. Defaults to `null`.
_options.dirs_: An array of directory paths. Each of them will be treated like _options.dir_.

Gather and merge configuration from `env`, additional `.json` files and `argv` in this order. 
`c11n` supports both error-first `callback` and `Promise` APIs.

**Note** If no file extension provided in a `filePath` then `.json` will be used.

### c11n.load([filePaths...], [options], [callback]) ⇒ Promise

It's the `module.exports` of this package, same as the above-mentioned.

### c11n.loadFromEnv([options]) ⇒ Object

_options.prefix_: Include only those `env` variables which are starting with this prefix. Defaults to `null`. 

Parse configuration from `process.env` and return result immediately.

### c11n.loadFromFile(path, [options], [callback]) ⇒ Promise

Read and parse configuration from the file at given `path`. 
Please notice that, it's an **async** function.   

### c11n.loadFromArgv([options]) ⇒ Object

Parse configuration from `process.argv` and return result immediately.
This function uses [minimist](https://www.npmjs.com/package/minimist) internally for pre-parsing.

### c11n.loadFromObject(object, [options]) ⇒ Object

Parse configuration from any given `object` and return result immediately. 
Used internally by other methods of this module.

This function iterates over keys of an object and breaks it into sub-objects along the `'.'`s and `'_'`s as separator characters.
Leading and trailing separators are ignored, repeating separators are reduced to a single `'_'`. 
    
**Example**
```js
const obj = {
    '__redis_port': 6379,
    'redis__host': 'localhost',
    'domain___': 'my-domain.com',
    'http.port': 8080,
    '_https...port': 8081
}

console.log(c11n.loadFromObject(obj))
```
Output:
```js
{
    redis: {
        port: 6379,
        host: 'localhost'
    },
    domain: 'my-domain.com',
    http: { port: 8080 },
    https: { port: 8081 }
}
```

If a key has a value but there are nested settings for the same key, then the original value will be accessible under the special key: `'_'`.
 
**Example**
```js
const obj = {
   domain: 'example.com',
   cache: true,
   cache_ttl: 1209600,
   cache_size: '300mb'
}

console.log(c11n.loadFromObject(obj))
```
Output:
```js
{
   domain: 'example.com',
   cache: {
       _: true,
       ttl: 1209600,
       size: '300mb'
   }
}
```

### options.freeze

If set to `false` then resulting object will be mutable. Defaults to `true`. 
All the above-mentioned methods are accepting this option. 

## Installation

With npm:

    npm install --save c11n
    
With git:
    
    git clone git://github.com/schwarzkopfb/c11n.git
    cd c11n
    npm test

## License

[MIT license](https://github.com/schwarzkopfb/c11n/blob/master/LICENSE).
