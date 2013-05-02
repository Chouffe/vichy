# import the Connect middleware (http://www.senchalabs.org/connect/)
connect = require('connect')
undo = require('./undo')

# import the ShareJS server
ShareJS = require('share').server

# create a settings object for our ShareJS server
ShareJSOpts =
    browserChannel:     # set pluggable transport to BrowserChannel
        cors: "*"
    db: {type: "mongo", opsCollectionPerDoc: false} # persistence

# create a Connect server
server = connect.createServer()
# attach a static file server that serves files from our static directory
server.use(connect['static'](__dirname + "/../static"))

# create a ShareJS server and bind to Connect server
#ShareJS.create.createModel ShareJSOpts
ShareJS.attach(server, ShareJSOpts)

server.use(undo)

# set our server port and start the server
port = 8000
server.listen(port, () -> console.log("Listening on " + port))
