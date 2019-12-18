# collab-whiteboard
A collaborative whiteboard with synced button, served with Flask.

## Design
This project uses Flask-SocketIO to synchronize the buttons and client's whiteboard state.

### Number of users
* When user connects, server will send `user` message to all clients with number of users connected

### Whiteboard
* Stroke object
    * thickness
    * color
    * array of points
    * time of stroke start

* First connection
    * Server sends `draw-strokes` message with list of strokes to be drawn
    
    
* Client stores stack of strokes made
* Undo
    * Pops stroke from strokes
    * Redraws strokes


* Updating server
    * Each client is identified by their request session ID
    * Start stroke
        * Client sends `stroke-start` message initial stroke object
    * Mouse move
        * Client sends `stroke-update` message with new point to append to stroke
        * Server sends `draw-new-stroke` message to other clients with new points drawn
    * Undo
        * Client sends `stroke-delete` message
        * Server sends `clear-board` message to all clients
        * Server sends `draw-strokes` message to all clients without deleted stroke
            * Necessary because clients will not store information of other clients' strokes so they undoer cannot redraw board themselves
    * Clear board
        * Client sends `clear-board` message
        * Client clears canvas
        * Server sends `clear-board` message to other clients
        
 
 * Save drawing to gallery
    * Client sends `save-drawing` message with canvas data blob
    * Server sends `add-saved-drawing` message with canvas data blob to all clients
    
### Button
Button will not function if socket is not connected.

* Button click counter
    * When user joins/button is clicked, server will send `update-click-count` message with number of clicks since startup
    * Client will update span with clicks

* Button click
    * Upon button click, client sends `btn-click` message to server
    * When server receives button click, it sends `btn-click` message to all clients
        * Clients press button
* Button release
    * Upon button release, client sends `btn-release` message to server
    * When server receives button release, it sends `btn-release` message to all clients
        * Clients release button