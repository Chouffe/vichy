http = require 'http'
url = require 'url'
qs = require 'querystring'

shareJSModel = null
UNDO_PARAM = 5

matchDocName = (urlString) ->
  urlParts = url.parse urlString
  parts = urlParts.pathname.match /^\/undo\/(?:([^\/]+?))\/?$/i
  return parts[1] if parts

#Return the index of the first element of array which matches
#cond
index = (array, cond) ->
  result = -1
  i = 0
  for elem in array
    if cond(elem)
      return i
    i += 1

#Take a list of ops and remove the undo / undone ops
filterUndone = (ops, callback) ->
    undo_ops = []
    do_ops = []
    for op in ops
      if op.meta and op.meta.undo
        undo_ops.push(op)
      else
        do_ops.push(op)

    for undo_op in undo_ops
      undone_version = undo_op.meta.undo
      i = index(do_ops, (do_op) ->
        do_op.v == undone_version)
      delete do_ops[i]

    #Remove undefined (= previously deleted) operations
    results = []
    for op in do_ops
      results.push(op) if op

    return results

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
        start = version - UNDO_PARAM
        start = 0 if start < 0
        console.log("Hello World")
        shareJSModel.getOps(doc_name, start, version, (error, ops) ->
            console.log("getOpsCallbackUndo")
            last_operation = ops[ops.length-1]
            last_version = last_operation.v
            console.log("Before filter")
            console.log(ops)
            ops = filterUndone(ops)
            console.log("After filter")
            console.log(ops)
            last_operation = ops[ops.length-1]
            last_op = last_operation.op[0] # Is it possible to have more than one op ?
            op_reversed = {}
            op_reversed.p = last_op.p
            if last_op.i
                op_reversed.d = last_op.i
            else
                op_reversed.i =last_op.d

            console.log(last_op)

            version = last_version+1
            op_undo = {
                v: version,
                op: [op_reversed],
                meta: {undo: last_version}
                }

            console.log("Undo")
            console.log(op_undo)
            shareJSModel.applyOp(doc_name, op_undo, (err, newVersion) ->
              if err
                console.log("err")
                console.log(err)
              else
                console.log("OK")
                console.log(newVersion))
            )
        
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
