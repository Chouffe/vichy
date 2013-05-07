var util = require("util"),
    EventEmitter = require("events").EventEmitter,
    nb = require("vim-netbeans"),
    $ = require("jquery");

// Check arguments
if (process.argv.length < 5) {
    console.log("Syntax:")
    console.log("    node client_ide.js <username> <password> <document_id>")
    return
}

var domain = "localhost:3000";
var token = login(process.argv[2], process.argv[3]);
var doc_id = process.argv[4];
var doc_version = 0;

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

// Contact the server to get the current version of the document
function getDocumentFromServer(buf) {
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
                pushTextToBuffer(buf, data["text"]);
            }
        }
    });
}

function pushTextToBuffer(buf, text) {
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

var docs = {},
    maxDocId = 1;

function Doc(name) {
    this.buffers = [];
    this.name = name;
    this.id = maxDocId++;
}
Doc.prototype = {
    id: 0,

    // Contents are addressed in netbeans by bytes,
    // so if there is utf in the document then strings cannot be used for it,
    // and it must be a Buffer
    contents: new Buffer(0),

    connectBuffer: function (buf) {
        console.log("Connecting a buffer");
        var self = this;
        this.buffers.push(buf);
        buf.startDocumentListen();

        var removeInsert;
        var removeInsertOffset;
        var extraNewline;

        // Try to combine a remove and insert into one operation.
        // This may be overkill.
        function combo(offset, removeLen, insertText) {
            var removeBytes = self.contents.slice(offset,
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

    disconnectBuffer: function (buf) {
        console.log("Disconnecting a buffer");
        var bufs = this.buffers;
        var i = bufs.indexOf(buf);
        if (i != -1) bufs.splice(i, 1);
        if (bufs.length == 0) {
            // no more connected buffers. clean up
            delete docs[this.name];
            delete this.contents;
        }
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
            buf.insert(0, self.contents.toString(), function (err) {
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
            self.contents = new Buffer(text || 0);
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
            this.contents = Buffer.concat([
                this.contents.slice(0, offset),
                bytes,
                this.contents.slice(offset)
            ], this.contents.length + length);
        }
        this.buffers.forEach(function (buf) {
            if (buf != from) buf.insert(offset, text);
        });
    },

    remove: function (offset, length, from) {
        if (offset + length >= this.contents.length) {
            length = this.contents.length - offset;
        }
        var removed = this.contents.slice(offset, offset + length).toString();
        var hasNewline = (this.contents[offset+length] == 10) &&
            this.contents[offset+length+1] == 10;
            //(this.contents[offset+length-1] != 10);
        console.log(offset +
            (hasNewline ? "~" : "-") + length + " " + removed);
            //"-" + length + " " + removed);
            //"-" + length);

        if (length) this.contents = Buffer.concat([
            this.contents.slice(0, offset),
            this.contents.slice(offset + length)
        ], this.contents.length - length);

        this.buffers.forEach(function (buf) {
            // todo: make this work
                    //if (buf != from) preserveCursor(buf, function () {
                //buf.remove(offset, length || 1);
            //});
            if (buf != from) buf.remove(offset, length || 1);
        });
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

    buf.getLength(function (length) {

        // Clean the buffer
        buf.remove(0, length);

        var offset = 0;
        var line = "";

        for(var i = 0; i < blame.length; i++)
        {
            line = blame[i]["date"] + " - " + blame[i]["author"] + "\n";
            buf.insert(offset, line);
            offset += line.length
        }

    buf.insertDone();

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
    });

    server.on("clientAuthed", function (vim) {
    
        // Open this buffer for syncing.
        vim.key("C-o", getDocumentFromServer);

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
            vim.buffers.forEach(function (buf) {
                var doc = buf && buf._doc;
                if (doc) doc.disconnectBuffer(buf);
            });
        });
    });
    
    server.listen(function () {
        console.log("Vim NetBeans server started.");
    });
    
    process.on("uncaughtException", function (err) {
        console.log("Caught exception: " + err);
        console.error(err.stack);
    });
}
