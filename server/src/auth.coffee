cookie = require 'cookie'

Store = null

module.exports = auth = (agent, action) ->
    console.log agent
    cookies = cookie.parse(agent.headers.cookie) if agent.headers.cookie?
    if action.type in ['read', 'create', 'update', 'connect']
        if agent.authentication?
            sid = agent.authentication
            console.log(sid)
        else
            sid = cookies['connect.sid'] if cookies?
            if not sid?
                action.reject()
                return
        sid = sid.split('.')[0].substr(2)
        console.log(sid)
        Store.get sid, (err, session) ->
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
