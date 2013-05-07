" Check if Python is installed
if !has('python')
    echo "Error: Required vim compiled with +python"
    finish
endif


function! Vichy()

    execute "so " . expand("<sfile>:p:h") . "/history.vim"
    " source history.vim
    nnoremap <buffer> - :call VichyToggleHistory()<enter>
    autocmd WinEnter * call CloseIfOnlyHistoryLeft()

endfunction

" function! VichySetLogin(login, password)
" " Set Login/Password in a .file to enable the server connection
" 
" python << EOF
" 
" import vim
" import json
" 
" 
" login = vim.eval("a:login")
" password = vim.eval("a:password")
" data = {'login': login, 'password': password}
" data_json = json.dumps(data)
" # print data_json
" 
" # TODO: Set an absolute path
" with open('.credentials', 'w') as f:
"     f.write(data_json)
" 
" EOF
" 
" endfunction

call Vichy()
