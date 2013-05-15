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
        timeStats 'Truc', (err, stats) ->
          if err
            console.log err
            return err
          console.log "Done"
          console.log stats
          for s in stats
              console.log s
              for v in s.value
                  console.log v

        #userStats 'test2', (err, stats) ->
            #console.log err, stats
        #userStats 'test2', (err, stats) ->
            #console.log err, stats
        #docStats (err, stats) ->
            #console.log err, stats
        #docdetStats (err, stats) ->
            #console.log err, stats

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

timeStats = (docName, callback) ->
    NB_SLOTS= 7
    now = Date.now()
    beginning = 0
    console.log("Here")
    client.collection 'ops', (err, collection) ->
        return callback? err if err
        #Get first version date
        #cursor = collection.find({_id: {doc: docName}, v:1})
        cursor = collection.find({_id: {doc: docName, v:0}})
        #cursor = collection.find({})
        beginning = 0
        cursor.toArray (err, array) ->
            console.log("to array")
            console.log(array)
            if err
              console.log(err)
            if (array.length != 1)
                err = "ERROR ! zero or more than one v1 for doc "+docName
                console.log(err)
                console.log(array.length)
                return callback? err
                for item in array
                  console.log("Oops")
                  console.log(item)
            beginning = array[0].opData.meta.ts
            console.log("Beginning")
            console.log(beginning)


            print = console.log
            emit = (author, obj) ->
              print( "emit")
              print(author)
              print(obj)
            
            map =  ->
                if this._id.doc == docName
                    slot = Math.floor(((this.opData.meta.ts - beginning)/(now - beginning))*NB_SLOTS)
                    operations = 0
                    for op in this.opData.op
                      operations += op.i.length if op.i?
                      operations += op.d.length if op.d?
                    print("EMIT")
                    print(this.opData.meta.name + " "+ slot + " "+operations)
                    slots = []
                    #if slot == 6
                      #print machin
                    #else
                      #print truc
                    for s in [0..NB_SLOTS-1]
                        slots.push(0)
                    slots[slot] = operations
                    emitted = {}
                    emitted[this.opData.meta.name] = slots
                    #TODO EXCHANGE
                    #emitted[this.opData.meta.name] = slots
                    #emitted[this.opData.meta.name] = [1,0,0,1,0,0,3]
                    emit(this.opData.meta.name, emitted)

            #cursor = collection.find({})
            #cursor.toArray (err, array) ->
                #for item in array
                    #console.log(item)
                    #map.apply(item)

            reduce = (key, values) ->
                reducedVal = {}
                print values
                for name_and_slots in values
                    print name_and_slots
                    for name,slots of name_and_slots
                        if not reducedVal[name]
                            reducedVal[name] = []
                            for slot in [0..NB_SLOTS-1]
                                reducedVal[name].push(0)
                        for s in [0..NB_SLOTS-1]
                            print "s"
                            print s
                            print slots[s]
                            reducedVal[name][s] += slots[s]
                        print "hello"
                        reducedVal[name][1] += slots[1]
                        reducedVal[name][2] += slots[2]
                return reducedVal

            #print "Map reduced Go"
            #a = ["Caroline", "Yoann"]
            values = [
              {a: [1,3,4,5,4,3,3], b: [1,3,4,5,4,3,3]},
              {b: [1,3,4,5,4,3,3]} ]
            print "red"
            #print reduce("c", values)
            print "OK"

            collection.mapReduce( map, reduce,
              { out: docName+"_"+ NB_SLOTS+ "_time_stats" , scope: { docName: docName, beginning: beginning, now: now, NB_SLOTS: NB_SLOTS } }
              , (err, col) ->
                return callback? err if err
                col.find().toArray (err, result) ->
                  return callback? err if err
                  callback? err, result
            )

exports.userStats = userStats
