http = require 'http'
url = require 'url'
qs = require 'querystring'

shareJSModel = null

matchDocName = (urlString) ->
  urlParts = url.parse urlString
  parts = urlParts.pathname.match /^\/undo\/(?:([^\/]+?))\/?$/i
  return parts[1] if parts

callUndo = (req, res) ->
    console.log("Entering CallUndo")

    # TODO: call getOps (version given by req), then submit the inverse operation
    queryData = ""

    req.on('data', (data) ->
        queryData += data)

    req.on('end', (end) ->
        POST = qs.parse(queryData)
        console.log(POST)
        doc_name = POST.doc_name
        version = POST.version
        start = version - 1
        start = 0 if start < 0
        console.log("Hello World")
        shareJSModel.getOps(doc_name, start, version, (error, ops) ->
            console.log("getOpsCallbackUndo")
            last_operation = "hello"
            last_operation = ops[0]
            last_version = last_operation.v
            last_op = last_operation.op[0] # Is it possible to have more than one op ?
            op_reversed = {}
            op_reversed.p = last_op.p
            if last_op.i
                op_reversed.d = last_op.i
            else
                op_reversed.i =last_op.d

            console.log(last_op)

            last_version = last_version+1
            op_undo = {
                v: last_version,
                op: [op_reversed],
                meta: {}
                }

            console.log("Undo")
            console.log(op_undo)
            shareJSModel.applyOp(doc_name, op_undo, (err, newVersion) ->
                if err
                    console.log("err")
                    console.log(err)
                else
                    console.log("OK")
                    console.log(newVersion)
            )
            for op in ops
              last_operation = op
              console.log("a")
              console.log(op)
              console.log("b")
              console.log(op.op)
              console.log("c")
              console.log(op.op[0].p)
              console.log(op.op[0].i))  

        
    obj =
        string: "Hello World"
    res.writeHead 200, {'Content-Type': 'application/json'}
    res.end JSON.stringify(obj) + '\n'
    )


parseUndo = (req, res, next) ->
    console.log(req.url)
    if req.url == "/undo"
      console.log("Entering undo handler")
      switch req.method
        when 'POST' then callUndo req, res
        else next()
    else
      next()

setModel = (model) ->
    console.log("Share model set")
    shareJSModel = model
    console.log(shareJSModel)

exports.parseUndo = parseUndo
exports.setModel = setModel
