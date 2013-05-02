http = require 'http'
url = require 'url'

matchDocName = (urlString) ->
  urlParts = url.parse urlString
  parts = urlParts.pathname.match /^\/undo\/(?:([^\/]+?))\/?$/i
  return parts[1] if parts

stub = (req, res) ->
    obj =
        string: "Hello World"
    res.writeHead 200, {'Content-Type': 'application/json'}
    res.end JSON.stringify(obj) + '\n'

# prepare data for createClient. If createClient success, then we pass client
# together with req and res into the callback. Otherwise, stop the flow right
# here and send error back
#
# req - instance of 'http.ServerRequest'
# res - instance of 'http.ClientRequest'
# createClient - create a sharejs client
# cb - callback which accept req, res, client in that order
auth = (req, res, createClient, cb) ->
  data =
    headers: req.headers
    remoteAddress: req.connection.remoteAddress

  createClient data, (error, client) ->
    if client
      cb? req, res, client
    else
      sendError res, error

# create a http request handler that is capable of routing request to the
# correct functions
# After getting the document name, `req` will have params which contain name of
# the document
makeDispatchHandler = (req, res, next) ->
    console.log("Entering undo handler")
    if name = matchDocName(req.url)
      req.params or= {}
      req.params.name = name
      switch req.method
        when 'GET'  then stub req, res
        when 'POST' then stub req, res
        else next()
    else
      next()

module.exports = makeDispatchHandler
