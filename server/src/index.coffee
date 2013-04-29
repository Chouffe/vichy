# import the Connect middleware (http://www.senchalabs.org/connect/)
connect = require('connect')

# import the ShareJS server
ShareJS = require('share').server

# create a settings object for our ShareJS server
ShareJSOpts =
    browserChannel:     # set pluggable transport to BrowserChannel
        cors: "*"
    db: {type: "mongo", opsCollectionPerDoc: false} # no persistence

# create a Connect server
server = connect.createServer()
# attach a static file server that serves files from our static directory
server.use(connect['static'](__dirname + "/../static"))

# create a ShareJS server and bind to Connect server
ShareJS.attach(server, ShareJSOpts)

# set our server port and start the server
port = 8000
server.listen(port, () -> console.log("Listening on " + port))
