" Check if Python is installed
if !has('python')
    echo "Error: Required vim compiled with +python"
    finish
endif


function! Vichy(login, password, port)

" let firstarg=a:login
" let secondarg=a:password

python << EOF

import vim


class User:
    """Represents the user"""

    def __init__(self, login, password):
        self.login = login
        self.password = password
        self.ID = ""


class UserManager:
    """Handles the User"""

    def __init__(self):
        pass

    def load(self, filename):
        """Loads the user from a file"""
        pass

    def save(self, user, filename):
        """Saves the user in a file"""
        pass

    def connect(self, login, password):
        """Creates a User given a password and a login"""
        print login, password


class Historique:
    pass


class HistoriqueManager:
    pass
        

login = vim.eval("a:login")
password = vim.eval("a:password")
port = vim.eval("a:port")

userManager = UserManager()
userManager.connect(login, password)

EOF

endfunction

function! VichyToggleHistory()
" Toggles the History of the file in a new window

python << EOF

import vim
import json


# Save initial positions/windows/buffers
initial_buffer = vim.current.buffer
initial_window = vim.current.window
initial_cursor_position = initial_window.cursor
num_line = len(initial_buffer)

# Move the cursor to the top of the file
vim.command("0")

# Create a new window
vim.command("30vnew")
vim.command("set nonumber")

# Save windows/buffers
history_buffer = vim.current.buffer
history_window = vim.current.window

# Create the JSON
d1 = {'author': 'Arthur', 'date': '2013-14-01:12:04'}
d2 = {'author': 'Paul', 'date': '2013-14-01:12:04'}
d3 = {'author': 'Romain', 'date': '2013-14-01:12:04'}
d4 = {'author': 'Bertrand', 'date': '2013-14-01:12:04'}

d = []
for i in xrange(num_line):

    if i % 4 == 0:
        d.append(d1)
    elif i % 4 == 1:
        d.append(d2)
    elif i % 4 == 2:
        d.append(d3)
    else:
        d.append(d4)


data = json.dumps(d)
hist = json.loads(data)
# hist = d

colors = ['blue', 'red', 'green', 'yellow']
date_color = 'red'
dates = set()
authors = set()

# Fill the history buffer with the JSON data
for i, line in enumerate(hist):
    if i > 0:
        vim.command("put =''")

    if line['author'] not in authors:
        authors.add(line['author'])

    if line['date'] not in dates:
        dates.add(line['date'])

    history_buffer[i] = "{} - {}".format(line['date'], line['author'])

# vim.command("highlight Date ctermfg={}".format(date_color))

for i, a in enumerate(authors):
    vim.command("syntax keyword Author{} {}".format(i, a))
    vim.command("highlight Author{} ctermfg={}".format(i, colors[i % len(colors)]))

# TODO: Fix the date coloring
for i, d in enumerate(dates):
    vim.command("syntax keyword Date{} {}".format(i, d))
    vim.command("highlight Date{} ctermfg={}".format(i, 'red'))

# Set the cursor at the same position as the initial buffer
history_window.cursor = initial_cursor_position

# Bind the scrolling between the two windows
vim.command("set scrollbind")
vim.command("set readonly")
vim.command("set hidden")

# Move back to the initial window
vim.command("wincmd l")
# Set the cursor at the initial position
initial_window.cursor = initial_cursor_position
# Bind the scrolling between the two windows
vim.command("set scrollbind")

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
