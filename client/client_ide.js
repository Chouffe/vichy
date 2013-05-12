var util = require("util"),
    EventEmitter = require("events").EventEmitter,
    nb = require("vim-netbeans"),
    cookie = require("cookie"),
    sharejs = require("share").client,
    http = require("http"),
    $ = require("jquery");

// Check arguments
if (process.argv.length < 7) {
    console.log("Syntax:")
    console.log("    node client_ide.js <host> <port> <username> <password> <document_id>")
    return
}

var domain = process.argv[2]+":"+process.argv[3];
var hostname = process.argv[2];
var port = process.argv[3];
var token = login(process.argv[4], process.argv[5]);
var doc_name = process.argv[6];
var doc_content = Buffer(0);
var cookies;
var shared_doc;
var current_content;
var removeInsert;
var removeInsertOffset;
var extraNewline;
var buffer;

// Log the current user on the server
function login(username, password) {
    var path = "/login/"+username+"/"+password+".json";
    var login = $.ajax({
        url: "http://"+domain+path,
        success: function(data, textStatus, xhr) {
            if (typeof(data["error"]) != "undefined"){
                console.log("Login error: "+data["error"]);
            }
            else{
                http.get({
                    hostname: hostname,
                    port: port,
                    path: path,
                    agent: false
                    }, function(res) {
                    cookies = cookie.parse(res.headers['set-cookie'][0]);
                    console.log(res.headers['set-cookie'][0]);
                    });
                launchServer();
            }
        }
    });
};

// Open the wanted document with share js
function openDocument(buf) {
    // Load current content of the file
    buf.getText(function(text){
        current_content = new Buffer(text);
        openShareJSDocument();
    });

    function openShareJSDocument() {
        console.log("Connecting with nodejs");
        sharejs.open(doc_name, 'text', {
            'origin': 'http://'+domain+'/channel',
            'authentication': cookies['connect.sid']
            }, function(error, d){
                shared_doc = d;
                if (shared_doc.getText() == ""){
                    console.log("Add new line !");
                    //shared_doc.insert(0, "\n");
                }
                pushTextToBuffer(buf, shared_doc.getText());

                shared_doc.on('insert', function(pos, text){
                    var b = Buffer(text);
                    console.log("Update: insert at "+pos+" "+b.length+" "+text)
                    var restoreCursor = preserveCursor(buffer);
                    if (current_content.length > pos+text.length+1) {
                        console.log("After: "+current_content.slice(pos+text.length, pos+text.length+1));
                    }
                    var removeAfter = false;
                    if (text != "\n" && (current_content.length <= pos+text.length+1 || current_content.slice(pos+text.length, pos+text.length+1) == "\n") && (pos == 0 || current_content.slice(pos-1, pos) == "\n")) {
                        removeAfter = true;
                        console.log("Remove line after !");
                    }
                    current_content = Buffer.concat([
                        current_content.slice(0, pos),
                        Buffer(text),
                        current_content.slice(pos)
                    ]);//, current_content.length + text.length);

                    //pushTextToBuffer(buffer, shared_doc.getText());
                    buffer.insert(pos, Buffer(text), function(){
                        buffer.getLength(function(len){
                            if (removeAfter && len > pos+text.length+1){
                                buffer.remove(pos+text.length, 1, function(){
                                    console.log("Removed");
                                    restoreCursor();
                                    buffer.insertDone();
                                });
                            }
                        });
                    });
                });

                shared_doc.on('delete', function(pos, text){
                    console.log("Update: delete at "+pos+" "+text.length+" "+text);
                    var restoreCursor = preserveCursor(buffer);
                    if (text.length) current_content = Buffer.concat([
                        current_content.slice(0, pos),
                        current_content.slice(pos + text.length)
                    ], current_content.length - text.length);
                    buffer.remove(pos, text.length, function(){
                        restoreCursor();
                        buffer.insertDone();
                    });

                    //pushTextToBuffer(buffer, shared_doc.getText());
                    //restoreCursor();
                });
            }
        );
    };
};

function pushTextToBuffer(buf, text) {
    if (text == current_content.toString().slice(0)){
        console.log("Buffer already up to date, not pushing");
    }
    else{
        current_content = Buffer(text+"\n");

        var restoreCursor = preserveCursor(buf);

        // clear buffer before inserting
        buf.getLength(function (len) {
            if (len)
                buf.remove(0, len, insertText);
            else
                insertText();
        });

        function insertText(err) {
            if (err) throw err;
            buf.insert(0, text.toString(), function (err) {
                if (err) throw err;
                restoreCursor();
                buf.insertDone();
            });
        }
    }
};

// Preserve the cursor position.
// If transaction is provided, execute it and then restore the cursor.
// Otherwise return the restoreCursor function to be called later.
function preserveCursor(buf, transaction) {
    var offset;
    function restoreCursor() {
        if (offset != null) buf.setDot(offset);
    }
    buf.getCursor(function (lnum, col, off) {
        offset = off;
        if (transaction) {
            transaction();
            restoreCursor();
        }
    });
    if (!transaction) {
        return restoreCursor;
    }
};

// Try to combine a remove and insert into one operation.
// This may be overkill.
function combo(offset, removeLen, insertText) {
    console.log("Combo!");
    var removeBytes = current_content.slice(offset,
            offset + removeLen),
        removeText = removeBytes.toString(),
        insertBytes = new Buffer(insertText.concat("\n")),
        insertLen = insertText.length;
    insertBytes[insertLen+1] = "\0";

    // check for simple append
    // appending on a blank line always inserts a new line
    if (removeLen > 0 && insertText.indexOf(removeText) == 0) {
        if (insertLen == removeLen) {
            // zero-length
            return;
        }
        var appendBytes = insertBytes.slice(removeLen, insertLen);
        //console.log('append', appendBytes.toString());
        insert(offset + removeLen, appendBytes, buffer);
        return;
    }

    extraNewline = removeBytes[removeLen-1] == 10
        && insertBytes[insertLen-1] != 10;

    // find where the old and new text differ
    var lastSame = 0;
    var j = 0;
    // find which characters were deleted
    var inCut = false;
    var cutStart = 0;
    var cutEnd = 0;
    for (var i = 0; i < removeLen; i++) {
        if (removeBytes[i] == insertBytes[j]) {
            j++;
            if (!inCut) {
                // text matches here
                if (!cutEnd) {
                    lastSame = j;
                }
            } else {
                // text has started matching again
                cutEnd = i;
                inCut = false;
            }
        } else {
            // text is changed
            if (!inCut) {
                // started changing
                inCut = true;
                if (!cutEnd) {
                    // first change
                    cutStart = i;
                }
            }
        }
    }
    if (inCut) {
        cutEnd = i;
    }

    if (cutEnd) {
        // remove cut
        var newline = removeBytes[cutEnd-1] == 10;
        remove(offset + cutStart, cutEnd - cutStart - newline, buffer);
    }

    if (j < insertLen) {
        // append changed text
        if (lastSame == 0 && insertBytes[0] != 10) {
            // can't insert at beginning of a line.
            // can't append on an empty line.
            // delete the line.
            remove(offset, 1, buffer);
            insertBytes[insertLen++] = 10;
        }
        insert(offset + lastSame, insertBytes.slice(lastSame, insertLen), buffer);
    }
};

function bufferWantsToRemove(buf, offset, length) {
    console.log("Want to remove offset "+offset+" length "+length);
    if (removeInsert) {
        removeInsert(null);
    }

    if (length == 0) {
        // vim likes these
        //remove(offset, 0, buf);
        return;
    }

    // try to pair this remove event with an insert
    removeInsertOffset = offset;
    removeInsert = function (text) {
        removeInsert = null;
        //console.log('removeInsert', offset, text);
        clearTimeout(timeout);
        if (text == null) defaultRemove();
        else combo(offset, length, text);
    };
    function defaultRemove() {
        console.log('default remove '+offset+" "+length);
        removeInsert = null;
        remove(offset, length, buf);
    }
    var timeout = setTimeout(defaultRemove, 200);
    //remove(offset, length, buf);
};

function bufferWantsToInsert(buf, offset, text) {
    console.log("Want to add offset "+offset+" text "+text);
    // detect when an insert happens immediately after a remove.
    if (removeInsert) {
        if (removeInsertOffset == offset) {
            removeInsert(text);
            return;
        } else {
            // it can't happen any later,
            // because the offsets would be off
            removeInsert(null);
        }
    }

    if (extraNewline && text == "\n") {
        // found a newline to ignore
        extraNewline = false;
    } else {
        insert(offset, text, buf);
    }
    //insert(offset, text, buf);
};

function insert(offset, text, from) {
    console.log(offset + "+" + text.length + " " + text);
    if (Buffer.isBuffer(text)) {
        var bytes = text;
        text = bytes.toString();
    } else {
        bytes = new Buffer(text);
    }
    var length = bytes.length;
    /*
    if (text == "") {
        text = "\n";
    } else {
    */
    if (text != "") {
        current_content = Buffer.concat([
            current_content.slice(0, offset),
            bytes,
            current_content.slice(offset)
        ], current_content.length + length);
        shared_doc.insert(offset, text, function() {});
        console.log("ShareJS insert: offset: "+offset+" text: "+text);
    }
};

function remove(offset, length, from) {
    if (offset + length >= current_content.length) {
        length = current_content.length - offset;
    }
    var removed = current_content.slice(offset, offset + length).toString();
    var hasNewline = (current_content[offset+length] == 10) &&
        current_content[offset+length+1] == 10;
    console.log(offset +
        (hasNewline ? "~" : "-") + length + " " + removed);

    if (length) current_content = Buffer.concat([
        current_content.slice(0, offset),
        current_content.slice(offset + length)
    ], current_content.length - length);

    console.log("ShareJS del: offset: "+offset+" length: "+length);
    shared_doc.del(offset, length, function() {});
};

function getBlameForBuffer(buf) {

    // For the tests
    var path = "/blame/" + doc_name + ".json";
    console.log("Call the function getBlameForBuffer()");

    $.ajax({
        // url: "http://"+domain+"/blame/"+doc_id+"/"+token+".json",
        // Tests
        url: "http://"+domain+path,
        // url: "http://"+domain+"/blame/"+doc_id+"/"+numb_lines+"/"+token+".json",
        success: function(data) {
            console.log("Success");
            if (typeof(data["error"]) != "undefined"){
                console.log("Login error: " + data["error"]);
            }
            else {
                console.log("Test: " + data);
                if (data["blame"]) {
                    console.log("Blame: " + data["blame"]);
                    fillBufferWithBlame(buf, data["blame"]);
                }
            }
        }
    });
};

function fillBufferWithBlame(buf, blame) {

    var separator = '|';
    buf.getLength(function (length) {

        // Clean the buffer
        buf.remove(0, length, function(error) {
            if (error) throw error;

            var offset = 0;
            var line = "";

            for(var i = 0; i < blame.length; i++)
            {
                line = blame[i]["date"] + " " + separator + " " + blame[i]["author"] + "\n";
                buf.insert(offset, line);
                offset += line.length
            }

            buf.insertDone();

        });
    });
};

// Simulate a sleep function
function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
            break;
        }
    }
}

function getDocNameForBuffer(buf) {
    return (buf.pathname.match(/[^\/]*$/) || 0)[0];
};

function launchServer(){

    var server = new nb.VimServer({
        debug: process.argv.indexOf("-v") != -1
        //,port:8765
    });

    server.on("clientAuthed", function (vim) {
        // Open this buffer for syncing.
        vim.key("C-o", function (buf) {
            //doc.getDocumentFromServer(buf);
            //doc.connectBuffer(buf);
            openDocument(buf);
            buffer = buf;
            buf.startDocumentListen();
        });

        vim.on("killed", function (buf) {
            var doc = buf && buf._doc;
            if (doc) doc.disconnectBuffer(buf);
        });

        // Listener for the vichyBlame
        vim.on("newBuffer", function (buffer) {
            // Sleep so that the vimscript can add the text vichyBlame
            sleep(50);
            buffer.getText(function (text) {
                if (text.replace(/(\r\n|\n|\r)/gm,"") == 'vichyBlame') {
                    console.log("Blamed called");
                    getBlameForBuffer(buffer);
                }
            });
        });
    
        vim.on("disconnected", function () {
            console.log("Vim client disconnected");
        });

        vim.on("remove", bufferWantsToRemove);

        vim.on("insert", bufferWantsToInsert);

        /*
        vim.on("remove", function (buffer, offset, length) {
            shared_doc.del(offset, length, function() {});
        });

        vim.on("insert", function (buffer, offset, text) {
            shared_doc.insert(offset, text, function() {});
        });
        */
    });
    
    server.listen(function () {
        console.log("Vim NetBeans server started.");
    });
    
    process.on("uncaughtException", function (err) {
        console.log("Caught exception: " + err);
        console.error(err.stack);
    });
}
