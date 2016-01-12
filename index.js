/**
 * Created by schwarzkopfb on 16/1/7.
 */

'use strict'

const fs              = require('fs'),
      path            = require('path'),
      argv            = require('minimist'),
      base            = path.dirname(module.parent.filename),
      slice           = Array.prototype.slice,
      expand          = path.resolve.bind(path, base),
      normalize       = /(_|\.)+/g,
      trim_leading    = /^(--)?_?/,
      trim_trailing   = /_?$/,
      default_options = {
          freeze: true,
          prefix: null,
          dirs:   null,
          dir:    null
      }

function loadFromObject(obj, options) {
    const opts   = extend({}, default_options),
          result = {},
          // track object references created during load process,
          // to be able to freeze them all when finished
          refs   = [ result ]

    if(options)
        extend(opts, options)

    for(let key in obj) {
        if(!obj.hasOwnProperty(key)) continue

        let field = key.toLowerCase()
                       .replace(normalize, '_')
                       .replace(trim_leading, '')
                       .replace(trim_trailing, '')

        if(opts.prefix) {
            if(!(field || key).startsWith(opts.prefix))
                continue
            else
                field = field.replace(opts.prefix, '')
        }

        let parts = field.split('_'),
            level = result,
            prevl = level,
            prevp = parts[ 0 ],
            val   = parseValue(obj[ key ])


        for(let i = 0, l = parts.length - 1; i <= l; i++) {
            let part = parts[ i ],
                last = i === l

            if(!part && !last)
                continue
            else if(last) {
                if(level instanceof Object) {
                    if(!(part in level))
                        level[ part ] = val
                    else if(level[ part ] instanceof Object)
                        level[ part ]._ = val
                    else
                        level[ part ] = val
                }
                else if (level != null) {
                    const wrap = { _: level }
                    wrap[ part ] = val
                    prevl[ prevp ] = wrap
                    refs.push(wrap)
                }

                break
            }
            else if(level instanceof Object) {
                if(!(part in level))
                    refs.push(level[ part ] = {})
            }
            else if(level != null) {
                const wrap = { _: level }
                prevl[ prevp ] = wrap

                if (last)
                    wrap[ part ] = val
                else {
                    let group = {}
                    wrap[ part ] = group
                    level = wrap
                    refs.push(group)
                }

                refs.push(wrap)
            }

            prevl = level
            prevp = part
            level = level[ part ]
        }
    }

    // make result and its sub-objects immutable
    while(opts.freeze && refs.length)
        Object.freeze(refs.shift())

    return result
}

function loadFromEnv(options) {
    return loadFromObject(process.env, options)
}

function loadFromFile(path, options, callback) {
    const opts = extend({}, default_options)

    if(arguments.length > 1) {
        if(options instanceof Object)
            extend(opts, options)
        else if(options instanceof Function)
            callback = options
    }

    if(!callback)
        callback = noop

    path = resolvePath(path)

    return new Promise((resolve, reject) => {
        fs.readFile(path, { encoding: 'utf8' }, (err, file) => {
            if(err) {
                callback(err)
                reject(err)
                return
            }

            try {
                var parsed = JSON.parse(file)
            }
            catch (ex) {
                err = new Error(`${ex.message} in file '${expand(path)}'`)
                callback(err)
                reject(err)
                return
            }

            if(opts.freeze)
                freeze(parsed)

            callback(null, parsed)
            resolve(parsed)
        })
    })
}

function loadFromArgv(options) {
    const opts   = extend({}, default_options),
          clean  = (key) => key.toLowerCase().replace(normalize, '_'),
          result = argv(process.argv.slice(2).map(clean))

    delete result._

    if(options)
        extend(opts, options)

    return loadFromObject(result, { freeze: opts.freeze /* ignore prefix of `argv` keys */ })
}

/**
 *
 * @param {...string} [paths] Config file paths.
 * @param {{freeze:bool,prefix:null,dir:string}} [options]
 * @param {function} [callback]
 * @returns {Promise}
 */
function loadConfiguration(paths/*, options, callback*/) {
    const opts  = extend({}, default_options),
          files = slice.call(arguments)

    let cb = noop

    if(files[ files.length - 1 ] instanceof Function)
        cb = files.pop()

    if(files[ files.length - 1 ] instanceof Object)
        extend(opts, files.pop())

    const result = loadFromEnv({ freeze: false, prefix: opts.prefix })

    return new Promise((resolve, reject) => {
        const dirs = Array.isArray(opts.dirs) ?
                  opts.dirs :
                  typeof opts.dir === 'string' ?
                      [ opts.dir ] :
                      null,
              next = dirs ?
                  filesByEnv(dirs) :
                  Promise.resolve(null)

        next.then((found) => {
                while(found && found.length)
                    files.push(found.shift())

                if(!files.length) {
                    extend(result, loadFromArgv(opts))

                    if(opts.freeze)
                        freeze(result)

                    cb(null, result)
                    resolve(result)
                }
                else
                    Promise
                        .all(files.map((file) => loadFromFile(file, { freeze: false })))
                        .then((files) => {
                            files.forEach((file) => extend(result, file))

                            extend(result, loadFromArgv(opts))

                            if(opts.freeze)
                                freeze(result)

                            cb(null, result)
                            resolve(result)
                        })
                        .catch((err) => {
                            cb(err)
                            reject(err)
                        })
            })
            .catch(reject)
    })
}

function noop() {}

function parseValue(val) {
    if(val !== '') {
        if(val === 'true')
            val = true
        else if(val === 'false')
            val = false
        else if(!isNaN(+val))
            val = +val
    }

    return val
}

function resolvePath(file) {
    return expand(path.extname(file) ? file : `${file}.json`)
}

function exists(path) {
    return new Promise(
        (resolve) =>
            fs.exists(path, (exists) => resolve(exists))
    )
}

function filesByEnv(dirs) {
    const file  = `${process.env.NODE_ENV || 'development'}.json`,
          paths = dirs.map((dir) => expand(`${dir}/${file}`))

    return new Promise((resolve, reject) => {
        Promise
            .all(paths.map(exists))
            .then((result) => {
                let found = []

                for(let i = 0, l = paths.length; i < l; i++)
                    if(result[ i ])
                        found.push(paths[ i ])

                resolve(found)
            })
            .catch(reject)
    })
}

function freeze(obj) {
    for(let key in obj)
        if(obj.hasOwnProperty(key) && obj[ key ] instanceof Object)
            freeze(obj[ key ])

    return Object.freeze(obj)
}

function extend(obj, add) {
    for(let key in add) {
        if(!add.hasOwnProperty(key)) continue

        let aval = add[ key ]

        if(aval instanceof Object) {
            let oval = obj[ key ]

            if(!(oval instanceof Object)) {
                if(Array.isArray(aval))
                    oval = []
                else
                    oval = {}
            }

            obj[ key ] = extend(oval, aval)
        }
        else
            obj[ key ] = aval
    }

    return obj
}

exports = module.exports = loadConfiguration

exports.load           = loadConfiguration
exports.loadFromEnv    = loadFromEnv
exports.loadFromFile   = loadFromFile
exports.loadFromArgv   = loadFromArgv
exports.loadFromObject = loadFromObject
