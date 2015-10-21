/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
Template.gameBoard.onRendered(function () {
    // Make sure we react to changes in the gameId
    this.autorun(function () {
        // Get the template instance
        var instance = Template.instance();
        // Assert that we have passed a game ID to the game board instance
        var data = Template.currentData();
        var gameId = data && data.gameId;

        // Wait until the game Id is a string
        if (!_.isString(gameId)) {
            return;
        }

        // If the gameId for which we're initializing is unchanged, don't proceed
        if (instance.initializedForGameId === gameId) {
            return;
        }

        instance.initializedForGameId = gameId;

        // Only react to changes in the data
        Tracker.nonreactive(function () {
            // Create a new DotsCanvas, which will be responsible for Two.js stuff
            var dotsCanvas = instance.dotsCanvas;

            if (!dotsCanvas) {
                dotsCanvas = instance.dotsCanvas = new DotsCanvas(instance.find('.board'));
            } else {
                // We will probably have to reset here
                dotsCanvas.reset();
            }

            // My internal mapping from my model dots to canvas's dots
            var _dots = {};
            // My internal mapping from my model connections to the canvas's connections
            var _connections = {};

            // Compute a dictionary key for a connection. Use a sort if connections are symmetric (for now they are not).
            var _connectionKey = function (playerId1, playerId2) {
                return [playerId1, playerId2].join(',');
            };

            // Helper to store a connection and make it in the UI
            var _connect = function (playerId1, playerId2, animation) {
                if (_.isUndefined(animation)) {
                    animation = true;
                }
                if (_.isNull(playerId1)
                    || _.isNull(playerId2)) {
                    return;
                }

                // playerId1 = '1'
                // playerId2 = '2'
                // connectId = '1,2'
                var connectionId = _connectionKey(playerId1, playerId2);
                _connections[connectionId] = dotsCanvas.connect(_dots[playerId1], _dots[playerId2], {animation: animation});
            };

            // Helper to delete a connection and make it happen in the UI
            var _disconnect = function (playerId1, playerId2, animation) {
                if (_.isUndefined(animation)) {
                    animation = true;
                }
                if (_.isNull(playerId1)
                    || _.isNull(playerId2)) {
                    return;
                }
                var connectionId = _connectionKey(playerId1, playerId2);
                dotsCanvas.disconnect(_connections[connectionId], {animation: animation});
                delete _connections[connectionId];
            };

            // Maintain different behavior depending on whether or not we are initializing this for the first time or not.
            var _initializing = true;

            // Set up the observe
            if (instance.observeHandle) {
                instance.observeHandle.stop();
                instance.observeHandle = null;
            }

            instance.observeHandle = Players.find({gameId: gameId}).observe({
                added: function (player) {
                    var _dot = _dots[player._id] = new Dot(player, {isLocalPlayer: Meteor.userId() === player.userId});
                    dotsCanvas.addDot(_dot);

                    if (!_initializing
                        && player.connectedToPlayerId) {
                        _connect(player._id, player.connectedToPlayerId, true);
                    }
                },
                changed: function (newPlayer, oldPlayer) {
                    if (newPlayer.connectedToPlayerId !== oldPlayer.connectedToPlayerId) {
                        _disconnect(oldPlayer._id, oldPlayer.connectedToPlayerId, true);
                        delete _connections[_connectionKey(oldPlayer._id, oldPlayer.connectedToPlayerId)];
                        _connect(newPlayer._id, newPlayer.connectedToPlayerId, true);
                    }
                },
                removed: function (player) {
                    // Remove all the connections with this player
                    Players.find({connectedToPlayerId: player._id}).forEach(function (otherPlayer) {
                        _disconnect(otherPlayer._id, player._id, false);
                        delete _connections[_connectionKey(otherPlayer._id, player._id)];
                    });

                    dotsCanvas.removeDot(player._id);
                    delete _dots[player._id];
                }
            });

            _initializing = false;

            // Add all the existing connections, now that all the dots have been rendered into the UI
            Players.find({gameId: gameId}).forEach(function (player) {
                if (player.connectedToPlayerId) {
                    _connect(player._id, player.connectedToPlayerId, false);
                }
            }, {reactive: false});

            // Setup the event handler
            dotsCanvas.addConnectListener(function (connection) {
                Meteor.call('connectToPlayer', connection.endDot._id, function (e, r) {
                    if (e) {
                        console.error(e);
                    }
                });
            });
        })
    });

});