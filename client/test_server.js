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
    res.send({
        'username' : req.params.username,
        'token'    : 'hfuh9_fqsdqs<xddqsw-"(-',
    });
});

app.get('/document/:document_id/:token.json', function(req, res) {
    res.send({
        'text'    : 'print Hello World',
        'version' : 42,
    });
});

app.get('/blame/:document_id/:token.json', function(req, res) {
    var blame = [
                   {
                    'line'   : '1',
                    'author' : 'Chuck Norris',
                    'Date'   : '2013-04-22T05:46:24Z'
                   },
                   {
                    'line'   : '2',
                    'author' : 'Chuck Norris',
                    'Date'   : '2013-04-22T05:46:42Z'
                   },
              ];
    res.send({
        'blame'  : blame,
        'doc_id' : req.params.doc_id,
        'token'  : req.params.token,
    });
});

app.listen(port);

console.log('Server running at ' + port );
