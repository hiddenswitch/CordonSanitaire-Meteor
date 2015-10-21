/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/

DotsTest1 = function () {
    var dotsCanvas = new DotsCanvas(document.body, {width: '100%', height: '100%'});
    var player1 = {_id: '1', location: {x: 0, y: 1}, name: 'player 1'};
    var player2 = {_id: '2', location: {x: 3, y: 2}, name: 'player 2'};

    var dot1 = new Dot(player1, {isLocalPlayer: true});
    var dot2 = new Dot(player2);
    dotsCanvas.addDot(dot1);
    dotsCanvas.addDot(dot2);

    dotsCanvas.addConnectListener(function (connection) {
        // Update the server with the connection that the player made
        // Meteor.call('connectPlayersInGame', gameId, playerId, playerId)

        // Note the end user here is not responsible for drawing (i.e., calling dotsCanvas.connect)
        console.log('Connecting players', connection.startDot._id, connection.endDot._id);
    });

    var connection1 = dotsCanvas.connect(dot1, dot2, {animation: true});

    window.setTimeout(function () {
        dotsCanvas.disconnect(connection1);
    }, 4000);
};

DotsTest2 = function () {
    debugger;
    var _Players = new Mongo.Collection(null);
    var _player1 = {_id: '1', userId: '1', location: {x: 0, y: 1}, name: 'player 1', connectedToPlayerId: null};
    var _player2 = {_id: '2', userId: '2', location: {x: 3, y: 2}, name: 'player 2', connectedToPlayerId: null};
    var _player3 = {_id: '3', userId: '3', location: {x: 5, y: 3}, name: 'player 3', connectedToPlayerId: '2'};
    _.each([_player1, _player2, _player3], function (a) {
        _Players.insert(a)
    });

    var dotsCanvas = new DotsCanvas(document.body, {width: '100%', height: '100%'});

    // My internal mapping from my model dots to canvas's dots
    var _dots = {};
    // My internal mapping from my model connections to the canvas's connections
    var _connections = {};

    var _connectionKey = function (playerId1, playerId2) {
        return [playerId1, playerId2].join(',');
    };

    var _connect = function (playerId1, playerId2, animation) {
        // playerId1 = '1'
        // playerId2 = '2'
        // connectId = '1,2'
        var connectionId = _connectionKey(playerId1, playerId2);
        _connections[connectionId] = dotsCanvas.connect(_dots[playerId1], _dots[playerId2], {animation: animation});
    };

    var _disconnect = function (playerId1, playerId2, animation) {
        if (_.isNull(playerId1)
            || _.isNull(playerId2)) {
            return;
        }
        var connectionId = _connectionKey(playerId1, playerId2);
        dotsCanvas.disconnect(_connections[connectionId], {animation: true});
    };

    var _myUserId = '1'; // Meteor.userId();

    var _initializing = true;

    // Set up
    _Players.find({}).observe({
        added: function (player) {
            var _dot = _dots[player._id] = new Dot(player, {isLocalPlayer: _myUserId === player.userId});
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
            _Players.find({connectedToPlayerId: player._id}).forEach(function (otherPlayer) {
                _disconnect(otherPlayer._id, player._id, false);
                delete _connections[_connectionKey(otherPlayer._id, player._id)];
            });

            dotsCanvas.removeDot(player._id);
            delete _dots[player._id];
        }
    });

    var _mockConnectMethodCall = function (connectToPlayerId) {
        // this.userId
        var userId = _myUserId;
        _Players.update({userId: userId}, {$set: {connectedToPlayerId: connectToPlayerId}});
    };

    _initializing = false;

    // Add all the existing connections
    _Players.find({}).forEach(function (player) {
        if (player.connectedToPlayerId) {
            _connect(player._id, player.connectedToPlayerId, false);
        }
    });

    // Setup the event handler
    dotsCanvas.addConnectListener(function (connection) {
        // Meteor.call('connectToPlayer', gameId, connectedToPlayerId)
        _mockConnectMethodCall(connection.endDot._id);
    });
};