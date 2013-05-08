qs = require 'querystring'

shareJSModel = null

insert = (lines, op, meta) ->
    buff = op.i
    p = op.p
    name = meta.name
    for i in [0..lines.length-1]
        #console.log(i)
        line = lines[i]
        if op.p >= line.start and ((line.ended and op.p < line.end) or (not line.ended and op.p <= line.end))
            while((idx = buff.indexOf('\n')) != -1)
                line.end = p + idx + 1
                line.author = name
                buff = buff.substr(idx+1)
                line.ended = true
                line = {start: line.end, end: line.end, author: null, ended: false}
                p = line.start
                lines.splice(++i, 0, line)
            line.end += buff.length
            line.author = name
            break
    if ++i < lines.length
        for j in [i..lines.length-1]
            line = lines[j]
            line.start += op.i.length
            line.end += op.i.length

delet = (lines, op, meta) ->
    buff = op.d
    p = op.p
    name = meta.name
    for i in [0..lines.length-1]
        #console.log(i)
        line = lines[i]
        if op.p >= line.start and ((line.ended and op.p < line.end) or (not line.ended and op.p <= line.end))
            dlines = buff.split('\n')
            if dlines[0].length > 0
                line.end = line.end - dlines[0].length
            if dlines.length-1 > 0
                line.end--
                removed = lines.splice(i+1, dlines.length-1)
                last_line = removed[removed.length-1]
                if dlines[dlines.length-1].length > 0
                    line.end += last_line.end - last_line.start - dlines[dlines.length-1].length
                line.ended = last_line.ended
            line.author = name
            break
    if ++i < lines.length
        for j in [i..lines.length-1]
            line = lines[i]
            line.start -= op.i.length
            line.end -= op.i.length


blame = (doc_name, callback) ->
    lines = [{start:0, end:0, author:null, ended: false}]
    console.log(doc_name);
    shareJSModel.getOps doc_name, 0, (error, ops) ->
        for operation in ops
            op = operation.op[0]
            console.log op
            if op? and op.i?
                insert lines, op, operation.meta
            if op? and op.d?
                delet lines, op, operation.meta
            console.log(lines)
        callback(lines)

callBlame = (req, res) ->
    console.log("Entering CallBlame")
    obj =
      string: ""

    # TODO: call getOps (version given by req), then submit the inverse operation
    queryData = req.body

    doc_name = queryData.doc_name
    version = queryData.version
    blame doc_name, (lines)->
        res.end JSON.stringify(lines) + '\n'

    res.writeHead 200, {'Content-Type': 'application/json'}

parseBlame = (req, res, next) ->
    console.log(req.url)
    if req.url == "/blame"
      console.log "Entering blame handler"
      switch req.method
        when 'POST' then callBlame req, res
        else next()
    else
      next()

setModel = (model) ->
    console.log "Share model set"
    shareJSModel = model

exports.setModel = setModel
exports.parseBlame = parseBlame
