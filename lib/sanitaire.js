/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
/**
 * Business logic namespace for Cordon Sanitaire
 * @type {{}}
 */
Sanitaire = {};

/**
 * Game states.
 * @type {{LOBBY: string, COUNTDOWN: string, IN_PROGRESS: string, ENDED: string}}
 */
Sanitaire.gameStates = {
    /**
     * Lobby is the waiting mode.
     */
    LOBBY: 'lobby',
    /**
     * Countdown means the game is currently counting down to start
     */
    COUNTDOWN: 'countdown',
    /**
     * In progress means the game is running.
     */
    IN_PROGRESS: 'in progress',
    /**
     * Ended means this game has ended.
     */
    ENDED: 'ended'
};

/**
 * What is the max number of players per game?
 * @type {number}
 */
Sanitaire.MAX_PLAYERS = 4;
/**
 * How long should a game last in seconds?
 * @type {number}
 */
Sanitaire.DURATION_SECONDS = 45;
/**
 * How long should the countdown last in seconds?
 * @type {number}
 */
Sanitaire.COUNTDOWN_SECONDS = 10;
/**
 * What is the absolute distance between players for the player location algorithm? Greater values mean it could be
 * harder to find a spot to spawn a player in the game.
 * @type {number}
 */
Sanitaire.DISTANCE_BETWEEN_PLAYERS_ABSOLUTE = 0.1;

/**
 * Creates a game
 * @returns {String} The game ID
 */
Sanitaire._createGame = function () {
    var gameId = Random.id().toLowerCase();
    var duration = Sanitaire.DURATION_SECONDS * 1000;
    var countdown = Sanitaire.COUNTDOWN_SECONDS * 1000;
    var game = {
        _id: gameId,
        createdAt: Date.now(),
        joinedPlayerIds: [],
        joinedUserIds: [],
        playerCount: 0,
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

/**
 * Starts a countdown to start the game for a given gameId
 * @param gameId
 */
Sanitaire._startCountdownForGame = function (gameId) {
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

/**
 * Create a player entry for the given userId in the given Game
 * @param gameId {String}
 * @param userId {String}
 * @returns {String} Returns the player ID
 * @private
 */
Sanitaire._addPlayerToGame = function (gameId, userId) {
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

    var playerCountAfterJoin = game.joinedPlayerIds.length + 1;

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

    Games.update(game._id, updateCommand);

    // if with our newly added player, we are at max players, set the game to full
    if (playerCountAfterJoin >= Sanitaire.MAX_PLAYERS) {
        // Start the game
        Sanitaire._startCountdownForGame(game._id);
    }

    return playerId;
};

/**
 * Find or create a game (match make) for a user and join that user into the game
 * @param userId {String}
 * @returns {{gameId: String, playerId: String}} The game and player ids of the joined game
 */
Sanitaire.matchMakeAndJoin = function (userId) {
    check(userId, String);
    // Check if this user is already in a game in progress
    var gameInProgress = Games.findOne({
        // The user is in the joined user ids
        joinedUserIds: userId,
        // AND the state is any of the following states
        state: {
            $in: [
                Sanitaire.gameStates.LOBBY,
                Sanitaire.gameStates.COUNTDOWN,
                Sanitaire.gameStates.IN_PROGRESS
            ]
        }
    });

    // If this userId is already in a game, find its player entry and return
    if (gameInProgress) {
        var existingPlayer = Players.findOne({gameId: gameInProgress._id, userId: userId});
        if (!existingPlayer) {
            throw new Meteor.Error(500, 'You are in a game but you do not have a player record?');
        }

        return {gameId: gameInProgress._id, playerId: existingPlayer._id};
    }

    // look for latest game
    var game = Games.findOne({state: Sanitaire.gameStates.LOBBY}, {sort: {createdAt: -1}, limit: 1});

    if (!game) {
        // TODO: Should be different options.
        game = {_id: Sanitaire._createGame()};
    }

    var playerId = Sanitaire._addPlayerToGame(game._id, userId);
    return {gameId: game._id, playerId: playerId};
};

/**
 * Quit the provided user from the provided game
 * @param gameId {String}
 * @param userId {String}
 */
Sanitaire.quitGame = function (gameId, userId) {
    check(gameId, String);
    check(userId, String);
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

/**
 * Try to connect the provided players, for any reason.
 * @param originPlayerId
 * @param destinationPlayerId
 * @returns {Boolean} True if the players were connected, false otherwise
 */
Sanitaire.tryConnectPlayers = function (originPlayerId, destinationPlayerId) {
    if (this.isSimulation) {
        return;
    }
    // Decrement the connections remaining count, and connect the players. If destination is null, do not decrement
    check(originPlayerId, String);
    check(destinationPlayerId, Match.OneOf(String, null));
    return !!Players.update({_id: originPlayerId, connectionsRemainingCount: {$gt: 0}}, {
        // If destination is null, do not decrement
        $inc: {connectionsRemainingCount: destinationPlayerId == null ? 0 : -1},
        $set: {connectedToPlayerId: destinationPlayerId}
    });
};