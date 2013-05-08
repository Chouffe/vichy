var util = require("util"),
    EventEmitter = require("events").EventEmitter,
    nb = require("vim-netbeans"),
    $ = require("jquery");

// Check arguments
if (process.argv.length < 7) {
    console.log("Syntax:")
    console.log("    node client_ide.js <host> <port> <username> <password> <document_id>")
    return
}

var domain = process.argv[2]+":"+process.argv[3];
var token = login(process.argv[4], process.argv[5]);
var doc_id = process.argv[6];
var doc_version = 0;
var doc_content = Buffer(0);

// Log the current user on the server
function login(username, password) {
    console.log("Login...");
    $.ajax({
        url: "http://"+domain+"/login/"+username+"/"+password+".json",
        success: function(data) {
            if (typeof(data["error"]) != "undefined"){
                console.log("Login error: "+data["error"]);
            }
            else{
                console.log("Received token: "+data["token"]);
                token = data["token"];
                launchServer();
            }
        }
    });
}

// Preserve the cursor position.
// If transaction is provided, execute it and then restore the cursor.
// Otherwise return the restoreCursor function to be called later.
function preserveCursor(buf, transaction) {
    var offset;
    function restoreCursor() {
        console.log('restore', offset);
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

function Doc(name, id, version) {
    this.buffer = 0;
    this.name = name;
    this.id = id;
    this.version = version;
}
Doc.prototype = {
    id: 0,
    version: 0,
    content: new Buffer(0),

    connectBuffer: function (buf) {
        console.log("Connecting a buffer");
        var self = this;
        this.buffer = buf;
        buf.startDocumentListen();

        var removeInsert;
        var removeInsertOffset;
        var extraNewline;

        // Try to combine a remove and insert into one operation.
        // This may be overkill.
        function combo(offset, removeLen, insertText) {
            var removeBytes = self.content.slice(offset,
                    offset + removeLen),
                removeText = removeBytes.toString(),
                insertBytes = new Buffer(insertText.concat("\n")),
                insertLen = insertText.length;
            insertBytes[insertLen+1] = "\0";
            //console.log("combo", offset, removeLen, insertLen);

            // check for simple append
            // appending on a blank line always inserts a new line
            if (removeLen > 0 && insertText.indexOf(removeText) == 0) {
                if (insertLen == removeLen) {
                    // zero-length
                    return;
                }
                var appendBytes = insertBytes.slice(removeLen, insertLen);
                //console.log('append', appendBytes.toString());
                self.insert(offset + removeLen, appendBytes, buf);
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
                //console.log('cut', i, j, lastSame, cutStart, cutEnd - cutStart,
                    //removeLen, insertLen, JSON.stringify(removeBytes.toString()), JSON.stringify(insertBytes.toString('utf8', 0, insertLen)), newline);
                self.remove(offset + cutStart, cutEnd - cutStart - newline, buf);
            }

            if (j < insertLen) {
                // append changed text
                if (lastSame == 0 && insertBytes[0] != 10) {
                    // can't insert at beginning of a line.
                    // can't append on an empty line.
                    // delete the line.
                    //console.log("deleting empty line");
                    self.remove(offset, 1, buf);
                    insertBytes[insertLen++] = 10;
                }
                //console.log('insert', insertBytes.slice(lastSame, insertLen).toString());
                self.insert(offset + lastSame, insertBytes.slice(lastSame, insertLen), buf);
            }
        }

        buf.on("remove", function (offset, length) {
            if (removeInsert) {
                removeInsert(null);
            }

            if (length == 0) {
                // vim likes these
                self.remove(offset, 0, buf);
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
                //console.log('default remove', offset);
                removeInsert = null;
                self.remove(offset, length, buf);
            }
            var timeout = setTimeout(defaultRemove, 200);
        });

        buf.on("insert", function (offset, text) {
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
                //console.log('normal insert');
                self.insert(offset, text, buf);
            }
        });

        buf.on("fileOpened", function (pathname) {
            self.writeToBuffer(buf);
        });
    },

    // Contact the server to get the current version of the document
    sendInsertToServer: function(buf, offset, text) {
        console.log("Send insert at "+offset+": "+text);
        console.log("http://"+domain+"/insert/"+doc.id+"/"+doc.version+"/"+offset+"/"+text+"/"+token+".json");
        $.ajax({
            url: "http://"+domain+"/insert/"+doc.id+"/"+doc.version+"/"+offset+"/"+text+"/"+token+".json",
            success: function(data) {
                if (typeof(data["error"]) != "undefined"){
                    console.log("Document error: "+data["error"]);
                }
                else{
                    doc.applyActionsFromServer(buf, actions);
                }
            }
        });
    },

    // Contact the server to get the current version of the document
    sendRemoveToServer: function(buf, offset, length) {
        console.log("Send insert at "+offset+": "+text);
        console.log("http://"+domain+"/remove/"+doc.id+"/"+doc.version+"/"+offset+"/"+length+"/"+token+".json");
        $.ajax({
            url: "http://"+domain+"/remove/"+doc.id+"/"+doc.version+"/"+offset+"/"+length+"/"+token+".json",
            success: function(data) {
                if (typeof(data["error"]) != "undefined"){
                    console.log("Document error: "+data["error"]);
                }
                else{
                    doc.applyActionsFromServer(buf, actions);
                }
            }
        });
    },

    applyActionsFromServer: function(buf, actions) {
        var length = actions.length, a = null;
        for (var i=0; i<length; i++) {
            a = actions[i];
            if (a["new_version"] <= doc.version)
                continue;
            doc.version = a["new_version"];
            if (a["action"] == "remove") {
                doc.buffer.write("", a["offset"], a["length"]);
            }
            else if (a["action"] == "insert") {
                doc.buffer.write(a["text"], a["offset"], 0);
            }
            console.log(doc.toString());
        }
    },

    // Contact the server to get the current version of the document
    getDocumentFromServer: function(buf) {
        console.log("Fetching document from server...");
        $.ajax({
            url: "http://"+domain+"/document/"+doc_id+"/"+token+".json",
            success: function(data) {
                if (typeof(data["error"]) != "undefined"){
                    console.log("Document error: "+data["error"]);
                }
                else{
                    console.log("Received document:\n"+data["text"]);
                    doc_version = data["version"];
                    doc.version = data["version"];
                    doc.pushTextToBuffer(buf, data["text"]);
                    doc_content = Buffer(data["text"]);
                }
            }
        });
    },
    
    pushTextToBuffer: function(buf, text) {
        doc.content = new Buffer(text);
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
    },

    disconnectBuffer: function (buf) {
        console.log("Disconnecting a buffer");
        this.buffer = 0;
        buf.removeAllListeners("insert");
        buf.removeAllListeners("remove");
        buf.removeAllListeners("fileOpened");
    },

    writeToBuffer: function (buf) {
        console.log("Writing doc contents to buffer");
        var self = this;

        var restoreCursor = preserveCursor(buf);

        // clear buffer before inserting
        buf.getLength(function (len) {
            if (len) buf.remove(0, len, removedOld);
            else removedOld();
        });

        function removedOld(err) {
            if (err) throw err;
            buf.insert(0, self.content.toString(), function (err) {
                // todo: fix this
                if (err) throw err;
                restoreCursor();
                buf.insertDone();
            });
        }
    },

    readFromBuffer: function (buf) {
        console.log("Reading doc contents from buffer");
        var self = this;
        buf.getText(function (text) {
            self.content = new Buffer(text || 0);
            buf.insertDone();
        });
    },

    insert: function (offset, text, from) {
        console.log(offset + "+" + text.length + " " + text);
        if (Buffer.isBuffer(text)) {
            var bytes = text;
            text = bytes.toString();
        } else {
            bytes = new Buffer(text);
        }
        var length = bytes.length;
        if (text == "") {
            text = "\n";
        } else {
            this.content = Buffer.concat([
                this.content.slice(0, offset),
                bytes,
                this.content.slice(offset)
            ], this.content.length + length);
        }
        /*
        this.buffers.forEach(function (buf) {
            if (buf != from) buf.insert(offset, text);
        });
        */
    },

    remove: function (offset, length, from) {
        if (offset + length >= this.content.length) {
            length = this.content.length - offset;
        }
        var removed = this.content.slice(offset, offset + length).toString();
        var hasNewline = (this.content[offset+length] == 10) &&
            this.content[offset+length+1] == 10;
        console.log(offset +
            (hasNewline ? "~" : "-") + length + " " + removed);
            //"-" + length + " " + removed);
            //"-" + length);

        if (length) this.content = Buffer.concat([
            this.content.slice(0, offset),
            this.content.slice(offset + length)
        ], this.content.length - length);

        /*
        this.buffers.forEach(function (buf) {
            // todo: make this work
                    //if (buf != from) preserveCursor(buf, function () {
                //buf.remove(offset, length || 1);
            //});
            if (buf != from) buf.remove(offset, length || 1);
        });
        */
    }
};

function getBlameForBuffer(buf) {

    // For the tests
    var numb_lines = 50;

    $.ajax({
        // url: "http://"+domain+"/blame/"+doc_id+"/"+token+".json",
        // Tests
        url: "http://"+domain+"/blame/"+doc_id+"/"+numb_lines+"/"+token+".json",
        success: function(data) {
            if (typeof(data["error"]) != "undefined"){
                console.log("Login error: " + data["error"]);
            }
            else {
                if (data["blame"]) {
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

var doc = new Doc("Blublu", process.argv[4], 0);

function launchServer(){

    var server = new nb.VimServer({
        debug: process.argv.indexOf("-v") != -1
    });

    server.on("clientAuthed", function (vim) {
        // Open this buffer for syncing.
        vim.key("C-o", function (buf) {
            doc.getDocumentFromServer(buf);
            doc.connectBuffer(buf);
        });

        // Blame
        vim.key("C-i", getBlameForBuffer);
        
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
                    getBlameForBuffer(buffer);
                }
            });
        });
    
        vim.on("disconnected", function () {
            console.log("Vim client disconnected");
            if (doc) doc.disconnectBuffer(doc.buffer);
        });
        /*
        vim.on("insert", function (buffer, offset, text) {
            console.log("Inserted text at " + offset + ": " + text);
            buffer.remove(offset, text.length);
        });
        vim.on("remove", function (buffer, offset, length) {
            console.log("Removed " + length + " bytes at " + offset);
            text_removed = doc_content.toString('utf8', offset, offset+length);
            console.log("Text removed: "+text_removed);
            buffer.insert(offset, text_removed);

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
