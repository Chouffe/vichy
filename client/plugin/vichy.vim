" Check if Python is installed
if !has('python')
    echo "Error: Required vim compiled with +python"
    finish
endif


function! Vichy()

python << EOF

def helloWorld():
    print "Hello world"

helloWorld()

EOF

endfunction
