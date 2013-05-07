// Services
var http = require('http');
var url = require('url');
var express = require('express');

var port = 3000
var app = express();

app.get('/remove/:document_id/:current_version/:offset/:length/:token.json', function(req, res) {
    res.send({
        'action'     : 'remove',
        'doc_id'     : req.params.document_id,
        'new_verion' : 43,
        'offset'     : req.params.offset,
        'version'    : req.params.current_version,
        'length'     : req.params.length,
        'author'     : 'Paul',
    });
});

app.get('/insert/:document_id/:current_version/:offset/:text/:token.json', function(req, res) {
    res.send({
        'action'     : 'insert',
        'doc_id'     : req.params.document_id,
        'new_verion' : 43,
        'offset'     : req.params.offset,
        'text'       : req.params.text,
        'version'    : req.params.current_version,
        'author'     : 'Romain',
    });
});

app.get('/login/:username/:password.json', function(req, res) {
    if (req.params.username == "romain" && req.params.password == "blublu"){
        res.send({
            'username' : req.params.username,
            'token'    : '37ab42b569e3e93c2ab4d7935c11d672',
        });
    }
    else{
        res.send({
            'username' : req.params.username,
            'error' : 'Wrong username/password'
        });
    }
});

app.get('/document/:document_id/:token.json', function(req, res) {
    res.send({
        'text'    : '#!/usr/bin/python2.7\n\nprint Hello World',
        'version' : 42,
    });
});

app.get('/blame/:document_id/:token.json', function(req, res) {
    var blame = [
                   {
                    'line'   : '1',
                    'author' : 'Chuck Norris',
                    'date'   : '2013-04-22T05:46:24Z'
                   },
                   {
                    'line'   : '2',
                    'author' : 'Chuck Norris',
                    'date'   : '2013-04-22T05:46:42Z'
                   },
              ];
    res.send({
        'blame'  : blame,
        'doc_id' : req.params.doc_id,
        'token'  : req.params.token,
    });
});

app.get('/blame/:document_id/:numb_line/:token.json', function(req, res) {

    var blame = new Array(req.params.numb_line);
    var line = null;
    for ( var i = 0; i < req.params.numb_line ; i++ ) {
        line =     {
                    'line'   : i + 1,
                    'author' : 'Chuck',
                    'date'   : '2013-04-22T05:46:24Z'
                   };
        blame[i] = line;
    }
    res.send({
        'blame'  : blame,
        'doc_id' : req.params.doc_id,
        'token'  : req.params.token,
    });
});

app.listen(port);

console.log('Server running at ' + port );
