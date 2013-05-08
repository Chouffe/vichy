if exists("b:current_syntax")
    finish
endif

echom "Our syntax highlighting code will go here."

let b:current_syntax = "vichyb"

syntax case match              
syntax case ignore

syntax match separator "\v\|"
syntax match date "\v^[0-9]{4}.*[0-9]{1}"
syntax match author "\v\ [a-z]*$"

highlight link date Function
highlight link author Keyword
highlight link separator Delimiter
