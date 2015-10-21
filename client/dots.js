/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/

/**
 * Create a new DotsCanvas, a combination of a two.js instance and a container which Just Works
 * @param container A div or CSS selector of where to construct the canvas
 * @constructor
 */
DotsCanvas = function (container, options) {
    // TODO: Use the container to create the dots canvas
    // This state may contain a Two.js instance
    this.state = null;

    // TODO: By the end of this function, we should be ready to render stuff
};

/**
 * Resets the dots canvas
 */
DotsCanvas.prototype.reset = function() {
    // TODO: Delete all the existing dots and connections, as though this were a brand new canvas
};
/**
 * Add a dot to the canvas
 * @param dot {Dot}
 * @return {String} An ID for the dot in the canvas. Might be the same as the provided ID
 */
DotsCanvas.prototype.addDot = function (dot) {
    // TODO: Inspect the dot. If the dot is ME, setup all the appropriate control code too

    if (dot.isLocalPlayer) {

        // TODO: Create all the appropriate picker widgetry
        // TODO: Do NOT draw the connection on behalf of the end user of this API

        // this._triggerConnection(connection);
    }

    if (dot.isPatientZero) {
        // TODO: handle this
    }

    return dot._id;
};

/**
 * Remove a dot from the canvas
 * @param id {String} Remove an id for a dot
 */
DotsCanvas.prototype.removeDot = function (id) {

};

/**
 * Connect two dots, optionally with animation
 * Idempotent
 * @param startDot {Dot} The first dot
 * @param endDot {Dot} The second dot
 * @param [options] {Object}
 * @param [options.animation=true] Perform the connection with animation. Defaults to true.
 * @return {Connection} a connection object that can later be removed
 */
DotsCanvas.prototype.connect = function (startDot, endDot, options) {
    // TODO: For some representation of dots, which may be as simple as x,y coordinate pairs or IDs of elements
    // inside two.js elements,

    return new Connection(startDot, endDot);
};

/**
 * Remove a given connection from the canvas.
 * Idempotent
 * @param connection {Connection}
 * @param [options] {Object}
 * @param [options.animation=true] Perform th disconnect with animation. Defaults to true
 */
DotsCanvas.prototype.disconnect = function (connection, options) {
    // TODO: For some representation of a connection, which may be as simple as two dots, remove the connection
};

/**
 * This function handles a connection event
 * @callback AddConnectListenerCallback
 * @param {Connection} Connection between two dots
 */

/**
 * Register an event handler on connection
 * @param handler {AddConnectListenerCallback} Handles a connection event
 */
DotsCanvas.prototype.addConnectListener = function (handler) {
    if (!this.handlers) {
        this.handlers = []
    }

    this.handlers.push(handler);
};

/**
 * Remove the event handler
 * @param handler {AddConnectListenerCallback} Handles a connection event
 */
DotsCanvas.prototype.removeConnectListener = function (handler) {
    if (!this.handlers) {
        return;
    }

    this.handlers.splice(this.handlers.indexOf(handler), 1);
};

DotsCanvas.prototype._triggerConnection = function (connection) {
    for (var i = 0; i < this.handlers.length; i++) {
        if (!this.handlers[i]) {
            continue;
        }

        this.handlers[i].apply(this, [connection]);
    }
};

/**
 * Create a dot from a player document
 * @param playerDocument
 * @constructor
 */
Dot = function (playerDocument, options) {
    // TODO: Convert a player document into a dot, a representation useful later on here
    // You should do this LAST once you know what you need
    this.isLocalPlayer = options && options.isLocalPlayer;
    this.isPatientZero = options && options.isPatientZero;
    // If this can be supported, this is ideal
    this._id = playerDocument._id;
};

/**
 * A simple representation of a connection
 * @param startDot {Dot}
 * @param endDot {Dot}
 * @constructor
 */
Connection = function (startDot, endDot) {
    this.startDot = startDot;
    this.endDot = endDot;
};