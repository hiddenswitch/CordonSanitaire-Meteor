/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/

var me;
var players = [];
var selectedPlayerID = -1;
var lastSelectedPlayer;
var lastPreSelectedPlayer;
var guides = [];

var numPlayers = 20;
var playerSize = 8;
var icon_spacing = 20;
var line_length = 28;

var aim_line;
var aim_circle;

// make layers
var background;
var middleground;
var foreground;

/**
 * Create a new DotsCanvas, a combination of a two.js instance and a container which Just Works
 * @param container A div or CSS selector of where to construct the canvas
 * @constructor
 */
DotsCanvas = function (container, options) {
    options = _.extend({
        width: $(window).width(),
        height: $(window).height()
    }, options);

    this.width = options.width;
    this.height = options.height;
    // TODO: Use the container to create the dots canvas
    // This state may contain a Two.js instance
    var two = this.two = new Two({
        fullscreen: true
    });

    two.appendTo(container || $('.two')[0] || document.body);

    // Update the renderer in order to generate corresponding DOM Elements.
    two.update();

    this.background = two.makeGroup();
    this.middleground = two.makeGroup();
    this.foreground = two.makeGroup();
    this.playerSize = 8;
    this.players = {};
    this.me = null;
    this.executeAfterMeAddedQueue = [];

    _.defer(function () {
        two.bind('resize', function () {
            // TODO: Fix tons of coordinates
        })
            .bind('update', function (frameCount) {
                // update loop here
                TWEEN.update();
            })
            .play();
    });

    console.log(two);
    TestTwo = two;

    /*
     var startTouchPoint = {x: 0, y: 0};

     container.addEventListener('onmousedown', function (event) {
     console.log("began press: (" + event.offsetX + ", " + event.offsetY + ")");
     }, false);

     container.addEventListener('touchstart', function (event) {
     // If there's exactly one finger inside this element
     if (event.targetTouches.length == 1) {
     var touch = event.targetTouches[0];
     // location of touch
     console.log("began touch: (" + touch.pageX + ", " + touch.pageY + ")");
     startTouchPoint.x = touch.pageX;
     startTouchPoint.y = touch.pageY;
     _makeMeBig();
     _showGuideLines();
     }
     }, false);

     container.addEventListener('touchmove', function (event) {
     // If there's exactly one finger inside this element
     if (event.targetTouches.length == 1) {
     var touch = event.targetTouches[0];
     // location of touch
     console.log("moved touch: (" + touch.pageX + ", " + touch.pageY + ")");

     updateLineDirection(touch.pageX - startTouchPoint.x, startTouchPoint.y - touch.pageY);
     }
     }, false);

     container.addEventListener('touchend', function (event) {
     console.log("ended touch: (" + event.pageX + ", " + event.pageY + ")");
     makeMeSmall();
     makePlayerSmall(selectedPlayerID);
     hideGuideLines();
     drawToSelectedPlayer();
     }, false);
     */

    // TODO: By the end of this function, we should be ready to render stuff
};

/**
 * Resets the dots canvas
 */
DotsCanvas.prototype.reset = function () {
    // TODO: Delete all the existing dots and connections, as though this were a brand new canvas
};
/**
 * Add a dot to the canvas
 * @param dot {Dot}
 * @return {String} An ID for the dot in the canvas. Might be the same as the provided ID
 */
DotsCanvas.prototype.addDot = function (dot) {
    // TODO: Inspect the dot. If the dot is ME, setup all the appropriate control code too
    var self = this;

    if (dot.isLocalPlayer) {
        var x_pos = dot.location.x * self.width;
        var y_pos = dot.location.y * self.height;

        aim_line = this.two.makeLine(x_pos, y_pos, x_pos, y_pos);
        aim_line.stroke = '#00CCFF';
        aim_line.opacity = 0;
        aim_line.linewidth = 6;
        aim_line.cap = 'round';
        this.background.add(aim_line);

        //aim_circle = two.makeCircle(x_pos, y_pos, playerSize / 2)
        //aim_circle.lineWidth = 0;
        //aim_circle.fill = '#000000';
        //background.add(aim_circle);

        var highlight = this.two.makeCircle(x_pos, y_pos, playerSize);
        highlight.stroke = '#000000';
        highlight.linewidth = 0;
        highlight.opacity = 0.3;
        highlight.fill = "#00CCFF";

        var icon = this.two.makeCircle(x_pos, y_pos, playerSize);
        icon.stroke = '#000000';
        icon.linewidth = 4;
        icon.fill = '#99DDFF';

        this.me = {
            icon: icon,
            highlight: highlight
        };
        // TODO: Create all the appropriate picker widgetry
        _.each(this.executeAfterMeAddedQueue, function (func) {
            func();
        });

        // TODO: Do NOT draw the connection on behalf of the end user of this API

        // this._triggerConnection(connection);
    } else {
        var x = dot.location.x * self.width;
        var y = dot.location.y * self.height;
        var id = dot._id;


        var highlight = this.two.makeCircle(x, y, this.playerSize);
        highlight.stroke = '#000000';
        highlight.linewidth = 0;
        highlight.opacity = 0.5;
        highlight.fill = '#FF9900';

        var icon = this.two.makeCircle(x, y, this.playerSize);
        icon.stroke = '#000000';
        icon.linewidth = 4;
        icon.fill = '#FFFF00';

        var playerUIForMe = function () {
            var guide = self.two.makeLine(x, y, self.me.icon.translation.x, self.me.icon.translation.y);
            guide.stroke = '#00CCFF';
            guide.linewidth = 4;
            guide.opacity = 0;
            self.background.add(guide);

            var pre_line = self.two.makeLine(self.me.icon.translation.x, self.me.icon.translation.y, self.me.icon.translation.x, self.me.icon.translation.y);
            pre_line.stroke = '#00CCFF';
            pre_line.opacity = 0.5;
            pre_line.linewidth = 4;
            self.background.add(pre_line);

            var line = self.two.makeLine(self.me.icon.translation.x, self.me.icon.translation.y, self.me.icon.translation.x, self.me.icon.translation.y);
            line.stroke = '#000000';
            line.opacity = 1;
            line.linewidth = 4;
            self.background.add(line);

            var theta = Math.atan2(self.me.icon.translation.x - x, self.me.icon.translation.y - y) + Math.PI / 2;
            if (theta > 2 * Math.PI) theta -= 2 * Math.PI;
            if (theta < 0) theta += 2 * Math.PI;
            //theta = 2 * Math.PI - theta;
            var degrees = theta * 180 / Math.PI;

            _.extend(self.players[id], {
                guide: guide,
                preline: pre_line,
                line: line,
                angle: degrees
            });
        };

        this.players[id] = {
            icon: icon,
            highlight: highlight
        };

        if (!!this.me) {
            playerUIForMe();
        } else {
            this.executeAfterMeAddedQueue.push(playerUIForMe);
        }
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
    this.location = playerDocument.location;
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