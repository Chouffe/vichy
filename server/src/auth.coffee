cookie = require 'cookie'

Store = null

module.exports = auth = (agent, action) ->
    cookies = cookie.parse(agent.headers.cookie) if agent.headers.cookie?
    if action.type in ['read', 'create', 'update', 'connect']
        sid = cookies['connect.sid'] if cookies?
        sid = sid.split('.')[0]
        Store.get sid.substr(2), (err, session) ->
            if err or not session? or not session.user?
                action.reject()
                return
            if action.type == 'connect'
                agent.name = session.user.user
                action.accept()
                return
            action.meta.name = agent.name if action.meta?
            action.accept()
    else
        action.reject()

module.exports.setStore = (store) ->
    Store = store
