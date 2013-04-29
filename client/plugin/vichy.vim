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

function! VichyHistory()

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
d1 = {'author': 'Arthur', 'date': 'Now'}
d2 = {'author': 'Paul', 'date': 'Yesterday'}

d = []
for i in xrange(num_line):
    if i % 2 == 0:
        d.append(d1)
    else:
        d.append(d2)
        
data = json.dumps(d)
hist = json.loads(data)

# Fill the history buffer with the JSON data
for i, line in enumerate(hist):
    if i > 0:
        vim.command("put =''")

    history_buffer[i] = "{} - {}".format(line['date'], line['author'])

# Set the cursor at the same position as the initial buffer
history_window.cursor = initial_cursor_position

# Bind the scrolling between the two windows
vim.command("set scrollbind")
vim.command("set readonly")

# Move back to the initial window
vim.command("wincmd l")
# Set the cursor at the initial position
initial_window.cursor = initial_cursor_position
# Bind the scrolling between the two windows
vim.command("set scrollbind")

EOF
endfunction
