http = require 'http'
url = require 'url'
qs = require 'querystring'

shareJSModel = null
#UNDO_PARAM = 100

#Return the index of the first element of array which matches
#cond
index = (array, cond) ->
  result = -1
  i = 0
  for elem in array
    if elem and cond(elem)
      return i
    i += 1

#Take a list of ops and remove the undo / undone ops
filterUndone = (ops, callback) ->
    undo_ops = []
    do_ops = []
    for op in ops
      if op.meta and (typeof op.meta.undo_start != "undefined")
        undo_ops.push(op)
      else
        do_ops.push(op)

    for undo_op in undo_ops
      undone_version_start = undo_op.meta.undo_start
      undone_version_end = undo_op.meta.undo_end
      for undone_version in [undone_version_start..undone_version_end]
        i = index(do_ops, (do_op) ->
          do_op.v == undone_version)
        delete do_ops[i]

    #Remove undefined (= previously deleted) operations
    results = []
    for op in do_ops
      results.push(op) if op

    return results

reverseOp = (op) ->
    op_reversed = {}
    op_reversed.p = op.p
    if op.i
        op_reversed.d = op.i
    else
        op_reversed.i = op.d
    return op_reversed

callUndo = (req, res) ->
    #TODO: secure...
    user = req.session.user.user
    obj =
      string: ""

    # TODO: call getOps (version given by req), then submit the inverse operation
    queryData = req.body

    doc_name = queryData.doc_name
    version = parseInt queryData.version
    #start = version - UNDO_PARAM
    #start = 0 if start < 0
    start = 0
    shareJSModel.getOps(doc_name, start, version, (error, ops) ->
        if ops.length < 1
          obj.string = "Nothing to undo"
          return
        undo_start = ops[ops.length-1].v
        version = undo_start+1

        #Remove undo operations and operations which were undone
        ops = filterUndone(ops)
        if ops.length < 1
          obj.string = "Already undone max number of operations"
          return

        last_version = -1
        last_name = -1
        last_position = -1
        last_operation = 'n'

        op_undo = {
        v: version,
        op: [],
        meta: {undo_start:undo_start , name: user}
        }

        #Create an opData
        for i in [ops.length-1..0]
          group_operations = ops[i]
          curr_version = group_operations.v
          curr_name = group_operations.meta.name
          # curr: [op0, op1, ... last_op] last: [op0, op1, ..., last_op]
          # We must check that the last operation of the current groups is consistent
          # with the first operation of the last group
          curr_position = group_operations.op[group_operations.op.length-1].p
          #If cursor only moved of 1 position (or less)
          if last_position != -1 and (curr_position < last_position-2 or curr_position > last_position+2)
            break
          if last_version != -1 and last_version-1 != group_operations.v
            break
          if last_name != -1 and last_name != curr_name
            break
          op_undo.meta.undo_end = curr_version
          #Reverse all the operations of the opData
          for j in [group_operations.op.length-1..0]
              op = group_operations.op[j]
              op_reversed = reverseOp(op)
              op_undo.op.push(op_reversed)

          last_name = curr_name
          last_version = curr_version
          last_position = group_operations.op[0].p


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
    callUndo req, res

setModel = (model) ->
    console.log("Share model set")
    shareJSModel = model

exports.parseUndo = parseUndo
exports.setModel = setModel
