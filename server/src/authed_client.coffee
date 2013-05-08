sharejs = require('share').client
http = require 'http'
cookie = require 'cookie'

http.get({hostname:'localhost', port:8088, path:'/login/ercool/pm3901.json', agent:false},(res) ->
    console.log res.headers['set-cookie']
    cookies = cookie.parse(res.headers['set-cookie'][0])
    console.log cookies
    sharejs.open('test2', 'text', {'origin': 'http://localhost:8088/channel', 'authentication': cookies['connect.sid']}, (error, doc) ->
        if error
            console.log error
        else
            text = 'Is it going to work or not ?'
            for position in [0...text.length]
                doc.insert(position, text[position])
    )
)


