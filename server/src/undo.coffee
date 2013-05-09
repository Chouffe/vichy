http = require 'http'
url = require 'url'
qs = require 'querystring'

shareJSModel = null
UNDO_PARAM = 100

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
    if elem and cond(elem)
      return i
    i += 1

packUndo = (ops) ->
  #Create an operation with the last word
  ops_to_undo = []
  last_position = -1
  last_version = -1
  for j in [ops.length-1..0]
    ops_to_undo.push ops[j]
    console.log("OPS[j]")
    console.log(ops[j])
    if ops[j].op.length != 1
      console.log("WARNING MORE THAN ONE OPERATION")
      console.log(ops[j])
      console.log(ops[j].op.length)
    operation = ops[j].op[0]
    new_position = operation.p
    new_version = ops[j].v
    if typeof operation.i == "undefined"
      console.log("no i")
      break
    if operation.i == ' ' or operation.i == '\n'
      console.log("i space")
      break
    if last_position != -1 and new_position != last_position-1
      console.log("Last position " + last_position)
      console.log("New position " + new_position)
      break
    if last_version != -1 and new_version != last_version-1
      console.log("Last version " + last_version)
      console.log("New version " + new_version)
      break
    last_position = new_position
    last_version = new_version
    console.log("Done")
  return ops_to_undo

#Take a list of ops and remove the undo / undone ops
filterUndone = (ops, callback) ->
    undo_ops = []
    do_ops = []
    for op in ops
      if op.meta and (typeof op.meta.undo != "undefined")
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
    #TODO: secure...
    user = req.cookies.user
    console.log("Entering CallUndo")
    obj =
      string: ""

    # TODO: call getOps (version given by req), then submit the inverse operation
    queryData = req.body

    console.log("On end")
    console.log(queryData)
    doc_name = queryData.doc_name
    version = parseInt queryData.version
    start = version - UNDO_PARAM
    start = 0 if start < 0
    shareJSModel.getOps(doc_name, start, version, (error, ops) ->
        if ops.length < 1
          obj.string = "Nothing to undo"
          return
        version = ops[ops.length-1].v + 1


        #Remove undo operations and operations which were undone
        ops = filterUndone(ops)
        if ops.length < 1
          obj.string = "Already undone max number of operations"
          return

        ops = packUndo(ops)
        console.log("Pack undo")
        console.log(ops)
        for i in [ops.length-1..0]
          last_operation = ops[i]
          # Is it possible to have more than one op ?
          last_op = last_operation.op[0]
          last_version = last_operation.v

          op_reversed = {}
          op_reversed.p = last_op.p
          if last_op.i
              op_reversed.d = last_op.i
          else
              op_reversed.i =last_op.d

          op_undo = {
              v: version,
              op: [op_reversed],
              meta: {undo: last_version, name: user}
              }

          shareJSModel.applyOp(doc_name, op_undo, (err, newVersion) ->
            if err
              obj.string = "UNDO: applyOp failed" + err
              console.log(obj.string)
            else
              console.log("UNDO: applyOp success " + newVersion)
          )
    )
    res.writeHead 200, {'Content-Type': 'application/json'}
    res.end JSON.stringify(obj) + '\n'


parseUndo = (req, res ) ->
    "Hello world"
    console.log(req.url)
    if req.url == "/undo"
      console.log("Entering undo handler")
      switch req.method
        when 'POST' then callUndo req, res

setModel = (model) ->
    console.log("Share model set")
    shareJSModel = model

exports.parseUndo = parseUndo
exports.setModel = setModel
