/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
var MAX_PLAYERS = 4;
/**
 * Business logic namespace for Cordon Sanitaire
 * @type {{}}
 */
Sanitaire = {};
/**
 * Get a random location on the game board, given certain constraints in options
 * @param options
 * @returns {{x: number, y: number}}
 */
Sanitaire.getRandomLocationOnBoard = function (options) {
    // TODO: Compute a valid random location
    return {x: Math.random() * 100, y: Math.random() * 100};
};

/**
 * Creates a game
 * @param options
 * @returns {String} The game ID
 */
Sanitaire.createGame = function (options) {
    var ownerUserId = options && options.ownerUserId;
    var gameId = Random.id().toLowerCase();
    var game = {
        _id: gameId,
        createdAt: Date.now(),
        joinedPlayerIds: [],
        joinedUserIds: [],
        playerCount: 0,
        isGameFull: false
    };

    Games.insert(game);

    return game._id;
};

Sanitaire.startCountdownForGame = function (gameId) {
    // TODO: Start the countdown to transition the game.
    // TODO: Should check if the countdown has already started, in case this is called more than once
    // TODO: Possibly should reset the countdown if another player has joined in the meantime.
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

    var playerLocation = Sanitaire.getRandomLocationOnBoard();

    // create a player entry
    var playerId = Players.insert({
        userId: userId,
        name: userId,
        gameId: gameId,
        location: playerLocation
    });

    var updateCommand = {
        $addToSet: {
            joinedPlayerIds: playerId,
            joinedUserIds: userId
        },
        $inc: {
            playerCount: 1
        }
    };

    var shouldStartGame = false;
    // if with our newly added player, we are at max players, set the game to full
    if (game.joinedPlayerIds.length + 1 >= MAX_PLAYERS) {
        updateCommand['$set'] = {isGameFull: true};

        // Start the game
        shouldStartGame = true;
    }

    var updateStatus = Games.update({_id: game._id}, updateCommand);
    if (updateStatus === 0) {
        throw new Meteor.Error(500, 'No document changed');
    }

    if (shouldStartGame) {
        Sanitaire.startCountdownForGame(game._id);
    }

    return playerId;
};
