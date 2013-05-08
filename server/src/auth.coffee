cookie = require 'cookie'

module.exports = auth = (agent, action) ->
    cookies = cookie.parse(agent.headers.cookie) if agent.headers.cookie?
    if action.type == 'connect'
        agent.name = cookies.user if cookies? and cookies.user?
        action.accept()
    else if action.type in ['read', 'create', 'update']
        action.meta.name = agent.name if action.meta?
        action.accept()
    else
        action.reject()
