" Check if Python is installed
if !has('python')
    echo "Error: Required vim compiled with +python"
    finish
endif

function! Vichy()

    nnoremap <buffer> - :call VichyToggleBlame()<enter>
    " FIXME
    " autocmd WinEnter * call CloseIfOnlyBlameLeft()

endfunction

function! VichyToggleBlame()
" Toggles the Blame of the file in a new window

python << EOF

import vim
import json
import re

show = True
bufferBlameName = 'vichy-history.vichyb'
pattern = '^.*{}$'.format(bufferBlameName)
prog = re.compile(pattern)

for b in vim.buffers:
    if prog.match(b.name):
        vim.command("call VichyBlameSetInvisible()")
        show = False
        break
if show:
    vim.command("call VichyBlameSetVisible()")

EOF

endfunction

function! VichyBlameSetVisible()

python << EOF

import vim
import json
import re

# Save initial positions/windows/buffers
initial_buffer = vim.current.buffer
initial_window = vim.current.window
initial_cursor_position = initial_window.cursor

# Move the cursor to the top of the file
vim.command("0")

# Create a new window
vim.command("40vnew {}".format(bufferBlameName))
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

endfunction

function! VichyBlameSetInvisible()

python << EOF

import vim

# Remove the buffer called vichy-history
vim.command("bdelete {}".format(bufferBlameName))
vim.command("bwipeout {}".format(bufferBlameName))

EOF

endfunction

" FIXME
function! CloseIfOnlyBlameLeft()

python << EOF

import vim
import json
import re


if len(vim.buffers) == 1:

    pattern = '^.*{}$'.format(bufferBlameName)
    prog = re.compile(pattern)

    for b in vim.buffers:
        vim.command("echom '{}'".format(b.name))
        if prog.match(b.name):
            vim.command("call VichyBlameSetInvisible()")
            vim.command("q!")
            break

EOF

endfunction

call Vichy()
