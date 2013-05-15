qs = require 'querystring'

shareJSModel = null

insert = (lines, op, meta) ->
    buff = op.i
    p = op.p
    name = meta.name
    date = meta.ts
    for i in [0..lines.length-1]
        #console.log(i)
        line = lines[i]
        if op.p >= line.start and ((line.ended and op.p < line.end) or (not line.ended and op.p <= line.end))
            idx1 = buff.indexOf('\n')
            idx2 = buff.indexOf('\r')
            idx = idx1
            if idx2 < idx1 and idx2 != -1
                idx = idx2
            while(idx != -1)
                line.end = p + idx + 1
                line.author = name
                buff = buff.substr(idx+1)
                line.ended = true
                line = {start: line.end, end: line.end, author: null, ended: false}
                p = line.start
                lines.splice(++i, 0, line)
                idx1 = buff.indexOf('\n')
                idx2 = buff.indexOf('\r')
                idx = idx1
                if idx2 < idx1 and idx2 != -1
                    idx = idx2
            line.end += buff.length
            line.author = name
            line.date = date
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
    date = meta.ts
    for i in [0..lines.length-1]
        #console.log(i)
        line = lines[i]
        if op.p >= line.start and ((line.ended and op.p < line.end) or (not line.ended and op.p <= line.end))
            dlines = buff.split('\n')
            if dlines[0].length > 0
                line.end = line.end - dlines[0].length
            if dlines.length-1 > 0
                removed = lines.splice(i+1, dlines.length-1)
                last_line = removed[removed.length-1]
                if last_line
                    line.end--
                    line.end += last_line.end - last_line.start - dlines[dlines.length-1].length
                    line.ended = last_line.ended
                else
                    line.ended = false
            line.author = name
            line.date = date
            break
    if ++i < lines.length
        for j in [i..lines.length-1]
            line = lines[j]
            line.start -= op.d.length
            line.end -= op.d.length


blame = (doc_name, callback) ->
    lines = [{start:0, end:0, author:null, ended: false}]
    shareJSModel.getOps doc_name, 0, (error, ops) ->
        for operation in ops
            for op in operation.op
                console.log op
                if op? and op.i?
                    insert lines, op, operation.meta
                if op? and op.d?
                    delet lines, op, operation.meta
                console.log(lines)
        callback(lines)

callBlame = (req, res) ->
    console.log("Entering CallBlame")

    doc_name = req.params.docname
    blame doc_name, (lines)->
        result = blame: []
        i = 1
        for line in lines
            result.blame.push {line: i++, author: line.author, date: new Date(line.date)}
        res.end JSON.stringify(result) + '\n'

    res.writeHead 200, {'Content-Type': 'application/json'}

parseBlame = (req, res, next) ->
    console.log(req.url)
    console.log "Entering blame handler"
    callBlame req, res

setModel = (model) ->
    console.log "Share model set"
    shareJSModel = model

exports.setModel = setModel
exports.parseBlame = parseBlame
