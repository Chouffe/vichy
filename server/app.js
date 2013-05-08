
/**
	* Node.js Login Boilerplate
	* More Info : http://bit.ly/LsODY8
	* Copyright (c) 2013 Stephen Braitsch
**/

var express = require('express');
var http = require('http');
var app = express();

var undo = require('./lib/undo');
var auth_method = require('./lib/auth')
var blame = require('./lib/blame')
ShareJS = require('share').server;


ShareJSOpts = {
  browserChannel: {
    cors: "*"
  },
  db: {
    //type: "none"
    type: "mongo",
    opsCollectionPerDoc: false,
  },
  auth: auth_method
};


app.configure(function(){
	app.set('port', 8088);
	app.set('views', __dirname + '/app/server/views');
	app.set('view engine', 'jade');
	app.locals.pretty = true;
//	app.use(express.favicon());
  app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ secret: 'super-duper-secret-secret' }));
	app.use(express.methodOverride());
	app.use(require('stylus').middleware({ src: __dirname + '/app/public' }));
	app.use(express.static(__dirname + '/app/public'));
  app.use(function logerror(err, req, res, next)
     {
       console.log(err.stack);
       console.log(req);
       next();
     });
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

ShareJS.attach(app, ShareJSOpts);
undo.setModel(app.model);
blame.setModel(app.model);

require('./app/server/router')(app);

http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
})
