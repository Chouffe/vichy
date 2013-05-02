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
        shareJSModel.getOps(doc_name, start, version, (error, ops) ->
            console.log("getOpsCallbackUndo")
            console.log(ops)
            console.log(error)))
        
    obj =
        string: "Hello World"
    res.writeHead 200, {'Content-Type': 'application/json'}
    res.end JSON.stringify(obj) + '\n'


parseUndo = (req, res, next) ->
    console.log("Entering undo handler")
    console.log(req.url)
    if req.url == "/undo"
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
