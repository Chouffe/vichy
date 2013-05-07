" Check if Python is installed
if !has('python')
    echo "Error: Required vim compiled with +python"
    finish
endif


function! VichyToggleHistory()
" Toggles the History of the file in a new window

python << EOF

import vim
import json
import re

show = True
bufferHistoryName = 'vichy-history'
pattern = '^.*{}$'.format(bufferHistoryName)
prog = re.compile(pattern)

for b in vim.buffers:
    if prog.match(b.name):
        vim.command("call VichyHistorySetInvisible()")
        show = False
        break
if show:
    vim.command("call VichyHistorySetVisible()")

EOF

endfunction

function! VichyHistorySetVisible()

python << EOF

import vim
import json
import re

# Save initial positions/windows/buffers
initial_buffer = vim.current.buffer
initial_window = vim.current.window
initial_cursor_position = initial_window.cursor
num_line = len(initial_buffer)

# Move the cursor to the top of the file
vim.command("0")

# Create a new window
vim.command("40vnew {}".format(bufferHistoryName))
vim.command("setlocal nonumber")
vim.command("nnoremap w :bwipeout %")
vim.command("nnoremap x :bwipeout %")

# Save windows/buffers into variables
history_buffer = vim.current.buffer
history_window = vim.current.window

# Call the plugin
history_buffer[0] = 'vichyBlame'
# Do something less ugly...
vim.command("echom 'Loading the vichy blame'")
vim.command("sleep 3000m")


# Set the cursor at the same position as the initial buffer
history_window.cursor = initial_cursor_position

# Bind the scrolling between the two windows
vim.command("set scrollbind")
vim.command("setlocal buftype=nowrite")
vim.command("set readonly")
vim.command("set hidden")

# Move back to the initial window
vim.command("wincmd l")
# Set the cursor at the initial position
initial_window.cursor = initial_cursor_position
# Bind the scrolling between the two windows
vim.command("set scrollbind")

EOF

call ColorBlame()

endfunction

function! VichyHistorySetInvisible()

python << EOF

import vim

# Remove the buffer called vichy-history
vim.command("bdelete {}".format(bufferHistoryName))
vim.command("bwipeout {}".format(bufferHistoryName))

EOF

endfunction

function! CloseIfOnlyHistoryLeft()

python << EOF

import vim
import json
import re


if len(vim.buffers) == 1:

    pattern = '^.*{}$'.format(bufferHistoryName)
    prog = re.compile(pattern)

    for b in vim.buffers:
        vim.command("echom '{}'".format(b.name))
        if prog.match(b.name):
            vim.command("call VichyHistorySetInvisible()")
            vim.command("q!")
            break

EOF

endfunction

" TODO: create a new syntax for this file
function! ColorBlame()

python << EOF

import vim
import json
import re


# # Create the JSON
# d1 = {'author': 'Arthur', 'date': '2013-14-01:12:04'}
# d2 = {'author': 'Paul', 'date': '2013-14-01:12:04'}
# d3 = {'author': 'Romain', 'date': '2013-14-01:12:04'}
# d4 = {'author': 'Bertrand', 'date': '2013-14-01:12:04'}
# 
# d = []
# for i in xrange(num_line):
# 
#     if i % 4 == 0:
#         d.append(d1)
#     elif i % 4 == 1:
#         d.append(d2)
#     elif i % 4 == 2:
#         d.append(d3)
#     else:
#         d.append(d4)
# 
# 
# data = json.dumps(d)
# hist = json.loads(data)

bufferHistoryName = 'vichy-history'
separator = '|';
pattern = '^.*{}$'.format(bufferHistoryName)
prog = re.compile(pattern)
blameBuffer = None

for b in vim.buffers:
    if prog.match(b.name):
        blameBuffer = b
        break

colors = ['blue', 'red', 'green', 'yellow']
date_color = 'red'
dates = set()
authors = set()

if blameBuffer is not None:

    for line in blameBuffer:
        info = line.replace(" ", "").strip().split(separator)
        authors.add(info[-1])

# # Fill the history buffer with the JSON data
# for i, line in enumerate(hist):
#     if i > 0:
#         # Add a new empty line
#         vim.command("put =''")
# 
#     if line['author'] not in authors:
#         authors.add(line['author'])
# 
#     if line['date'] not in dates:
#         dates.add(line['date'])
# 
#     # Add the history line
#     history_buffer[i] = "{} - {}".format(line['date'], line['author'])
# 
# # vim.command("highlight Date ctermfg={}".format(date_color))
# 

print authors
for i, a in enumerate(authors):
    vim.command("syntax keyword Author{} {}".format(i, a))
    vim.command("highlight Author{} ctermfg={}".format(i, colors[i % len(colors)]))

# 
# # TODO: Fix the date coloring
# for i, d in enumerate(dates):
#     vim.command("syntax keyword Date{} {}".format(i, d))
#     vim.command("highlight Date{} ctermfg={}".format(i, 'red'))
# 
EOF

endfunction
