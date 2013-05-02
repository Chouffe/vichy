http = require 'http'
url = require 'url'
ShareJS = require 'share'
qs = require 'querystring'

matchDocName = (urlString) ->
  urlParts = url.parse urlString
  parts = urlParts.pathname.match /^\/undo\/(?:([^\/]+?))\/?$/i
  return parts[1] if parts

invertComponent = (c) ->
    if c.i?
        {d:c.i, p:c.p}
    else
        {i:c.d, p:c.p}

reverse = (op) ->
    console.log(op)
    undo_op =
        v: op.v + 1
        op: (invertComponent o for o in op.op)
        meta:
            source: op.meta.source
            flag: 'undo'
    console.log(undo_op)
    return undo_op

callUndo = (req, res, model) ->
    console.log("Entering CallUndo")
    # TODO: call getOps (version given by req), then submit the inverse operation
    queryData = ""

    req.on('data', (data) ->
        queryData += data)

    req.on 'end', (end) ->
        POST = qs.parse queryData
        #console.log POST
        doc_name = POST.doc_name
        version = POST.version
        start = Math.max version - 1, 0

        model.getOps doc_name, start, version, (err, ops) ->
            console.log "Callback getops"
            console.log ops
            op = ops[0]
            model.applyOp doc_name, reverse(op), (err, what) ->
                console.log(err, what)

    obj =
        string: "Hello World"
    res.writeHead 200, {'Content-Type': 'application/json'}
    res.end JSON.stringify(obj) + '\n'


# create a http request handler that is capable of routing request to the
# correct functions
# After getting the document name, `req` will have params which contain name of
# the document
parseUndo = (model) ->
    console.log(model)
    (req, res, next) ->
        console.log("Entering undo handler")
        #console.log(req.url)
        if req.url == "/undo"
          switch req.method
            when 'POST' then callUndo req, res, model
            else next()
        else
          next()

module.exports = parseUndo
