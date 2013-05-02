http = require 'http'
url = require 'url'
ShareJS = require 'share'
qs = require 'querystring'

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
        console.log(POST))
        
    obj =
        string: "Hello World"
    res.writeHead 200, {'Content-Type': 'application/json'}
    res.end JSON.stringify(obj) + '\n'


# create a http request handler that is capable of routing request to the
# correct functions
# After getting the document name, `req` will have params which contain name of
# the document
parseUndo = (req, res, next) ->
    console.log("Entering undo handler")
    console.log(req.url)
    if req.url == "/undo"
      switch req.method
        when 'POST' then callUndo req, res
        else next()
    else
      next()

module.exports = parseUndo
