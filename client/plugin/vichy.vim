" Check if Python is installed
if !has('python')
    echo "Error: Required vim compiled with +python"
    finish
endif

function! Vichy()

    " FIXME: Absolute Path!
    source history.vim
    nnoremap <buffer> - :call VichyToggleHistory()<enter>
    autocmd WinEnter * call CloseIfOnlyHistoryLeft()
    " call VichyVimsyncStart()

endfunction

" Does not work...
function! VichyVimsyncStart()

python << EOF

import subprocess

subprocess.call("sleep 5", shell=True)

EOF


endfunction

function! VichySetLogin(login, password)
" Set Login/Password in a .file to enable the server connection

python << EOF

import vim
import json


login = vim.eval("a:login")
password = vim.eval("a:password")
data = {'login': login, 'password': password}
data_json = json.dumps(data)
# print data_json

# TODO: Set an absolute path
with open('.credentials', 'w') as f:
    f.write(data_json)

EOF

endfunction

function! VichyConnectServer(host, port)

python << EOF

import socket
import vim
import json


port = int(vim.eval("a:port"))
host = vim.eval("a:host")

# print host, port
print "Connection {} through port {}".format(host, port)

con = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
con.connect((host, port))

print "Connexion done"

# con.close()

EOF

endfunction

function! VichyCloseConnection()
" CLose the connection with the server

python << EOF

con.close()

print "connexion closed"

EOF

endfunction

function! VichyAuthServer()

python << EOF

import vim
import json

with open('.credentials', 'r') as f:
    data = json.loads(f.readline())
    print data, type(data)

    # Send the json login/password to login the user
    con.send(json.dumps(data))

EOF

endfunction

function! VichyGetHistory(host, port, login, password)
" Get the common history of the file by requesting the server

python << EOF

import socket
import vim
import json


# Set the parameters
login = vim.eval("a:login")
password = vim.eval("a:password")
port = int(vim.eval("a:port"))
host = vim.eval("a:host")

# Connect to the server through a socket
con = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
con.connect((host, port))

auth = {'login': login, 'password': password}
data_auth = json.dumps(auth)

# Step 1: authentification
con.send(data_auth)
response_auth = con.recv(1024)

if response_auth != 1:
    print "Not allowed to connect the server"

else:
    # Step 2: Request the history
    request = "history"
    con.send(request)
    history = con.recv(1024)
    print history

con.close()

EOF

endfunction

function! VichyExtractLocalUpdates()
" Gets the local updates encoded in vim

python << EOF

EOF
endfunction

call Vichy()
