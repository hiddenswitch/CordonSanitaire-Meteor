/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
/**
 * Business logic namespace for Cordon Sanitaire
 * @type {{}}
 */
Sanitaire = {};

Sanitaire.gameStates = {
    LOBBY: 'lobby',
    COUNTDOWN: 'countdown',
    IN_PROGRESS: 'in progress',
    ENDED: 'ended'
};

Sanitaire.MAX_PLAYERS = 4;
Sanitaire.DURATION_SECONDS = 45;
Sanitaire.COUNTDOWN_SECONDS = 10;
Sanitaire.DISTANCE_BETWEEN_PLAYERS_ABSOLUTE = 0.1;

/**
 * Creates a game
 * @param options
 * @returns {String} The game ID
 */
Sanitaire.createGame = function () {
    var gameId = Random.id().toLowerCase();
    var duration = Sanitaire.DURATION_SECONDS * 1000;
    var countdown = Sanitaire.COUNTDOWN_SECONDS * 1000;
    var game = {
        _id: gameId,
        createdAt: Date.now(),
        joinedPlayerIds: [],
        joinedUserIds: [],
        playerCount: 0,
        isGameFull: false,
        duration: duration,
        countdown: countdown,
        state: Sanitaire.gameStates.LOBBY,
        patientZero: {
            // Assign a path to patient zero
            // TODO: Generate this path randomly
            path: [
                {x: 0.5, y: 0.5},
                {x: 0.3, y: 0.1},
                {x: 0.9, y: 0.9}
            ]
        }
    };

    game._id = Games.insert(game);

    return game._id;
};

/**
 * Starts a game by transitioning it to progress and kicking off the countdown timer
 * @param gameId
 * @private
 */
Sanitaire._startGame = function (gameId) {
    var game = Games.findOne(gameId);
    if (!game) {
        throw new Meteor.Error(404, 'Game not found.');
    }

    // Start a timer to end the game
    var durationOfGame = game.duration;
    Meteor.setTimeout(function () {
        Sanitaire._endGame(gameId);
    }, durationOfGame);

    // Set the game to be in progress
    var now = new Date();
    Games.update(gameId, {$set: {state: Sanitaire.gameStates.IN_PROGRESS, startedAt: now}});
};

/**
 * Ends a game by transitioning it to an end game state and computing the score
 * @param gameId
 * @private
 */
Sanitaire._endGame = function (gameId) {
    Games.update(gameId, {$set: {state: Sanitaire.gameStates.ENDED}});
};

Sanitaire.startCountdownForGame = function (gameId) {
    var game = Games.findOne(gameId);
    if (!game) {
        throw new Meteor.Error(404, 'Game not found.');
    }

    var notLobbyStates = [Sanitaire.gameStates.COUNTDOWN, Sanitaire.gameStates.IN_PROGRESS, Sanitaire.gameStates.ENDED];
    var hasStarted = _.contains(notLobbyStates, game.state);

    // If we have already started the game, go ahead and just return
    if (hasStarted) {
        return;
    }

    // Start a timer to transition and do the update
    var countdownDelay = game.countdown;

    Meteor.setTimeout(function () {
        // Now, when the timer elapses, start the game
        Sanitaire._startGame(gameId);
    }, countdownDelay);

    // Set the game to be in the countdown state
    Games.update(gameId, {$set: {state: Sanitaire.gameStates.COUNTDOWN}});
};

Sanitaire.addPlayerToGame = function (gameId, userId) {
    var game = Games.findOne(gameId);

    if (!game) {
        if (Meteor.isClient) {
            return;
        }

        throw new Meteor.Error(404, 'Game not found.');
    }

    // check if game already contains a player for this userId
    var player = Players.findOne({gameId: gameId, userId: userId});
    if (!!player) {
        return player._id;
    }

    // Generate a location for this player
    var playerLocation = Sanitaire.getRandomLocationOnBoard({
        gameId: gameId,
        distance: Sanitaire.DISTANCE_BETWEEN_PLAYERS_ABSOLUTE
    });

    // create a player entry
    var playerId = Players.insert({
        userId: userId,
        name: userId,
        gameId: gameId,
        connectionsRemainingCount: 999999,
        connectedToPlayerId: null,
        location: playerLocation
    });

    // Setup an update command
    var updateCommand = {
        $addToSet: {
            joinedPlayerIds: playerId,
            joinedUserIds: userId
        },
        $inc: {
            // Record that an additional player has joined
            playerCount: 1
        }
    };

    var shouldStartGame = false;
    // if with our newly added player, we are at max players, set the game to full
    if (game.joinedPlayerIds.length + 1 >= Sanitaire.MAX_PLAYERS) {
        updateCommand['$set'] = {isGameFull: true};

        // Start the game
        shouldStartGame = true;
    }

    var updateStatus = Games.update({_id: game._id}, updateCommand);
    if (updateStatus === 0) {
        throw new Meteor.Error(500, 'No document changed');
    }

    // If after we've updated the game, the game should be started, start its countdown
    if (shouldStartGame) {
        Sanitaire.startCountdownForGame(game._id);
    }

    return playerId;
};

Sanitaire.quitGame = function (gameId, userId) {
    var player = Players.findOne({gameId: gameId, userId: userId});
    if (!player) {
        throw new Meteor.Error(500, 'Cannot quit a game you haven\'t joined.');
    }

    Games.update(gameId, {
        $pull: {
            joinedPlayerIds: player._id,
            joinedUserIds: userId
        },
        $inc: {
            playerCount: -1
        }
    });

    // Disconnect everyone connected to this player
    Players.update({gameId: gameId, connectedToPlayerId: player._id}, {$set: {connectedToPlayerId: null}});

    // Remove this player
    Players.remove(player._id);
};

Sanitaire.tryConnectPlayers = function (originPlayerId, destinationPlayerId) {
    // Decrement the connections remaining count, and connect the players. If destination is null, do not decrement
    check(originPlayerId, String);
    check(destinationPlayerId, Match.OneOf(String, null));
    return Players.update({_id: originPlayerId, connectionsRemainingCount: {$gt: 0}}, {
        // If destination is null, do not decrement
        $inc: {connectionsRemainingCount: destinationPlayerId == null ? 0 : -1},
        $set: {connectedToPlayerId: destinationPlayerId}
    });
};