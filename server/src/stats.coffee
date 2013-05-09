mongodb = require 'mongodb'

defaultOptions =
  # Prefix for all database keys.
  db: 'sharejs'

  # Default options
  hostname: '127.0.0.1'
  port: 27017
  mongoOptions: {auto_reconnect: true}
  user: null      # an optional username for authentication
  password: null  # an optional password for authentication
  opsCollectionPerDoc: true # whether to create an ops collection for each document or just have a large single ops collection

options = defaultOptions

client = new mongodb.Db(options.db, new mongodb.Server(options.hostname, options.port, options.mongoOptions), {safe: true})

client.open (err, db) ->
    if not err
        client = db
        console.log('connected')
        if options.user and options.password
            client.authenticate(options.user, options.password)
        userStats 'test2', (err, stats) ->
            console.log err, stats
        docStats (err, stats) ->
            console.log err, stats
        docdetStats (err, stats) ->
            console.log err, stats

userStats = (docName, callback) ->
    client.collection 'ops', (err, collection) ->
        return callback? err if err

        match = $match :
            '_id.doc' : docName
        group = $group :
            _id : "$opData.meta.name"
            ops :
                $sum : 1
        collection.aggregate [match, group], (err, result) ->
            callback?(err, result)

docStats = (callback) ->
    client.collection 'ops', (err, collection) ->
        return callback? err if err
        unwind = $unwind: "$opData.op"
        group = $group :
            _id : "$_id.doc"
            i :
                $sum : "$opData.op.p"
            d :
                $sum : "$(opData.op.d).length"
        collection.aggregate [unwind, group], (err, result) ->
            callback?(err, result)

docdetStats = (callback)->
    client.collection 'ops', (err, collection) ->
        return callback? err if err
        map = ->
            for op in this.opData.op
                val = {i: 0, d:0}
                val.i = op.i.length if op.i?
                val.d = op.d.length if op.d?
                emit(this._id.doc, val)
        reduce = (keydocid, values) ->
            reducedVal = {i:0, d:0}
            for val in values
                reducedVal.i += val.i
                reducedVal.d += val.d
            return reducedVal

        collection.mapReduce map, reduce, { out: "docs_stats" }, (err, col)->
            return callback? err if err
            col.find().toArray (err, result) ->
                return callback? err if err
                callback? err, result


exports.userStats = userStats
