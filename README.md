vichy
======

Vim plugin for collaborative code editing. Vichy is built with top new
technologies such as Node.js (Share.js) and MongoDB. 

Generally speaking, Vichy enables a server communication and sends the
operations made in the connected buffer. The server runs the OT algorithms to
obtain the overall merged buffer and sends it back to the clients through an
HTTP API.

Client-Side
=====

It is required to run first the script called client_ide.js with
> node client_ide.js

Then, a buffer is synchronized with the IDE with
> :nbs
> <C-o>

In normal Mode, one can hit the keystroke '-' to display a blame of the current buffer.

Server-Side
=====

TODO
