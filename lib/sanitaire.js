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
 * Barricade construction actions
 * @type {{START_BUILD: string, STOP_BUILD: string, START_DEMOLISH: string, STOP_DEMOLISH: string}}
 */
Sanitaire.barricadeActions = {
    NONE: 0,
    /**
     * Person started construction.
     */
    START_BUILD: 1,
    /**
     * Person stopped their construction by swiping away.
     */
    STOP_BUILD: 2,
    /**
     * Person started to demolish a barricade.
     */
    START_DEMOLISH: 3,
    /**
     * Person stopped demolishing barricade by swiping away.
     */
    STOP_DEMOLISH: 4
};

/**
 * What is the max number of players per game?
 * @type {number}
 */
Sanitaire.MAX_PLAYERS = Meteor.settings && Meteor.settings.public && Meteor.settings.public.maxPlayers || 4;
/**
 * How long should a game last in seconds?
 * @type {number}
 */
Sanitaire.DURATION_SECONDS = Meteor.settings && Meteor.settings.public && Meteor.settings.public.durationSeconds || 45;
/**
 * How long should the countdown last in seconds?
 * @type {number}
 */
Sanitaire.COUNTDOWN_SECONDS = Meteor.settings && Meteor.settings.public && Meteor.settings.public.countdownSeconds || 10;
/**
 * How long should it take to build/complete a single tile barricade in milliseconds?
 * @type {number}
 */
Sanitaire.BARRICADE_CONSTRUCTION_MILLIS = Meteor.settings && Meteor.settings.public && Meteor.settings.public.constructionMillis || 1000;
/**
 * What is the absolute distance between players for the player location algorithm? Greater values mean it could be
 * harder to find a spot to spawn a player in the game.
 * @type {number}
 */
Sanitaire.DISTANCE_BETWEEN_PLAYERS_ABSOLUTE = 0.1;

Sanitaire.DEFAULT_MAP = 'London_single_lane.csv';

Sanitaire.WALL_TILE_INDICES = [13, 14];

/**
 * Creates a game
 * @returns {String} The game ID
 */
Sanitaire._createGame = function () {
    var gameId = Random.id().toLowerCase();
    var duration = Sanitaire.DURATION_SECONDS * 1000;
    var countdown = Sanitaire.COUNTDOWN_SECONDS * 1000;
    var mapId = Sanitaire.DEFAULT_MAP;
    var map = Maps.findOne(mapId);
    //Todo: refactor
    var phaserMap = new SanitaireMaps.IPhaserTileMap(map);
    var mapInfo = SanitaireMaps.getMapInfo(phaserMap);

    var patientZeroStartPosition = SanitairePatientZero.getStartPosition({mapId: mapId});
    var game = {
        _id: gameId,
        createdAt: Date.now(),
        joinedPlayerIds: [],
        joinedUserIds: [],
        playerCount: 0,
        duration: duration,
        countdown: countdown,
        state: Sanitaire.gameStates.LOBBY,
        mapId: mapId,
        patientZero: {
            // Patient zero will get a random start position
            speed: 100,
            path: [
                {
                    x: Math.round(patientZeroStartPosition.x / 16),
                    y: Math.round(patientZeroStartPosition.y / 16)
                }
            ],
            pathUpdatedAt: null
        },
        barriersLog: [],
        barriers: []
        //, barriers: _.map(mapInfo.intersections, function (intersection) {
        //    return {
        //        intersectionId: intersection.id,
        //        barrierExistsTime: Infinity,
        //        barrierStopsExistingTime: Infinity
        //    };
        //})
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

    // Compute a new patient zero path
    Sanitaire._changePatientZeroPath(game._id);

    // Kick off a patient zero thinking loop
    SanitairePatientZero.think(game._id);

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
    // Stop computing new patient zero behaviors
    SanitairePatientZero.stopThink(gameId);
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
    Games.update(gameId, {$set: {state: Sanitaire.gameStates.COUNTDOWN, countdownStartTime: new Date()}});
};

Sanitaire.getRandomPositionInMap = function (options) {
    var map = Maps.findOne(options.mapId);
    var phaserMap = new SanitaireMaps.IPhaserTileMap(map);
    var mapInfo = SanitaireMaps.getMapInfo(phaserMap);
    var positionInRoadInfo = SanitaireMaps.getRandomStartPosition(mapInfo.roads);
    var position = {
        x: (positionInRoadInfo && positionInRoadInfo.x * phaserMap.tileWidth) || 16,
        y: (positionInRoadInfo && positionInRoadInfo.y * phaserMap.tileHeight) || 16
    };
    return position || {x: 16, y: 16};
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
    var randomPosition = Sanitaire.getRandomPositionInMap({
        mapId: game.mapId
    });

    var playerId = Players.insert({
        userId: userId,
        name: userId,
        gameId: gameId,
        connectionsRemainingCount: 999999,
        connectedToPlayerId: null,
        location: playerLocation,
        // TODO: Set a smarter position
        position: randomPosition,
        velocity: {x: 0, y: 0}
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

/**
 * Updates the player's position and velocity in the player object
 * @param playerId {String} The player ID
 * @param position {{x: number, y: number}} The new position of the player
 * @param velocity {{x: number, y: number}} The new Phaser physics velocity
 * @param updatedAt {Date} The server time when the client issued this command
 * @returns {boolean} True if the record was successfully updated
 */
Sanitaire.updatePlayerPositionAndVelocity = function (playerId, position, velocity, updatedAt) {
    check(playerId, String);
    check(position, {x: Number, y: Number});
    check(velocity, {x: Number, y: Number});
    check(updatedAt, Number);

    return !!Players.update({_id: playerId},
        {
            $set: {position: position, velocity: velocity, updatedAt: updatedAt}
        });
};

//TODO: This is currently called for all tiles bordering the intersection, could get slow if intersections are big

/**
 * Adds a wall tile at the given tile position and game. Also updates patient zero if necessary.
 * @param gameId {String} The ID of the game
 * @param position {{x: number, y: number}} The position in tile coordinates of the new wall
 * @param intersectionId {number} The id of the intersection being built on
 * @param [orientation] {*} An orientation, reserved and unused.
 * @returns {boolean} True if the quarantine was successfully added.
 */
Sanitaire.addQuarantine = function (gameId, position, intersectionId, orientation) {
    check(gameId, String);
    check(position, {x: Number, y: Number});
    check(intersectionId, Number);

    var update = {
        $set: {},
        $addToSet: {
            intersectionIds: intersectionId
        }
    };
    // Use a key for this add to prevent synchronizing a whole array
    update.$set['quarantines' + Random.id()] = position;

    // If this tile was along the path, patient zero needs a new path!
    var game = Games.findOne(gameId, {fields: {'patientZero.path': 1}});
    if (_.any(game.patientZero.path, function (existingPathPosition) {
            return existingPathPosition.x === position.x
                && existingPathPosition.y === position.y
        })) {
        Sanitaire._changePatientZeroPath(gameId);
    }

    return !!Games.update(gameId, update);
};

//TODO: function to remove quarantine
/**
 * Removes a wall tile at the given tile position and game. Also updates patient zero if necessary.
 * @param gameId {String} The ID of the game
 * @param position {{x: number, y: number}} The position in tile coordinates of the old wall
 * @param intersectionId {number} The id of the intersection being demolished
 * @param orientation {*} An orientation, reserved and unused.
 * @returns {boolean} True if the quarantine was successfully removed.
 */
Sanitaire.removeQuarantine = function (gameId, position, intersectionId, orientation) {
    check(gameId, String);
    check(position, {x: Number, y: Number});
    check(intersectionId, Number);

    var update = {
        $unset: {},
        $pull: {
            intersectionIds: intersectionId
        }
    };
    // Use a key for this add to prevent synchronizing a whole array
    update.$unset['quarantines' + Random.id()] = position;

    // If this tile was along the path, patient zero needs a new path!
    var game = Games.findOne(gameId, {fields: {'patientZero.path': 1}});
    if (_.any(game.patientZero.path, function (existingPathPosition) {
            return existingPathPosition.x === position.x
                && existingPathPosition.y === position.y
        })) {
        Sanitaire._changePatientZeroPath(gameId);
    }

    return !!Games.update(gameId, update);

};

/**
 * From a game object, returns an array of positions of the quarantine tiles
 * @param game {*} A game document
 * @returns {[{x: number, y: number}]} An array of tile positions of walls
 * @private
 */
Sanitaire._getBarricadePositions = function (game) {
    var now = new Date();

    var intersectionIds = _.compact(_.map(game.barriers, function (barrier) {
        if (barrier.barrierExistsTime <= now && barrier.barrierStopsExistingTime > now) {
            // returns the intersection ids that are completely constructed
            return barrier.intersectionId;
        }
    }));

    /*
     * The following block will get this game's map info for use
     */
    var map = Maps.findOne(game.mapId);
    var phaserMap = new SanitaireMaps.IPhaserTileMap(map);
    var mapInfo = SanitaireMaps.getMapInfo(phaserMap);

    var barricadePositions = _.flatten(_.map(intersectionIds, function (intersectionId) {
        return mapInfo.intersectionsById[intersectionId].borderTiles;
    }));

    return barricadePositions;
};

/**
 * Generates a new path for the patient zero in the given game
 * @param game {String|*} Game document or game ID
 * @param [map] {*} A cached map
 * @param [quarantineTiles] {*} Cached quarantine tiles
 * @private
 */
Sanitaire._changePatientZeroPath = function (game, map, quarantineTiles) {
    if (Meteor.isClient) {
        return;
    }

    game = _.isString(game) ? Games.findOne(game) : game;
    map = map || Maps.findOne(game.mapId);
    var phaserMap = new SanitaireMaps.IPhaserTileMap(map);
    var tiles = phaserMap.tiles;

    // Update the map based on quarantine data
    quarantineTiles = quarantineTiles || Sanitaire._getBarricadePositions(game);

    _.each(quarantineTiles, function (tile) {
        tiles[tile.y][tile.x] = Sanitaire.WALL_TILE_INDICES[0];
    });

    var now = new Date();

    var currentPosition = SanitairePatientZero.estimatePositionFromPath(game.patientZero.speed, game.patientZero.path, game.patientZero.pathUpdatedAt, {
        time: now,
        tileSize: 16
    });

    // The tiles structure incorporates the walled-off quarantine data
    var path = SanitairePatientZero.computeNewRoute(tiles, currentPosition, {tryAll: true});

    Games.update(game._id, {
        $set: {
            'patientZero.path': path,
            'patientZero.pathUpdatedAt': now
        }
    });
};

/**
 *
 * @param gameId {String} current gameId
 * @param playerId {String} playerId of player that took action
 * @param intersectionId {Number} the id of the intersection construction is taking place on
 * @param messageType {Number} describes whether building or demolishing
 * @param time {Date} date object created at time of action
 */
Sanitaire.addConstructionMessageToLog = function (gameId, playerId, intersectionId, messageType, time) {
    check(gameId, String);
    check(playerId, String);
    check(intersectionId, Number);
    check(messageType, Number);
    check(time, Date);
    // add elements to construction log
    // this is each element with no logic
    var logEntry = {
        time: time,
        intersectionId: intersectionId,
        type: messageType,
        playerId: playerId
    };

    var game = Games.findOne(gameId);

    // Simulate adding to the barriers log
    game.barriersLog.push(logEntry);


    var barriers = _.map(_.groupBy(game.barriersLog, 'intersectionId'), function (logEntries, intersectionId) {
        var latestEntry = _.last(_.sortBy(logEntries || [], 'time'));

        var barrierExistsTime = Infinity;
        var barrierStopsExistingTime = Infinity;

        if (latestEntry) {
            switch (latestEntry.type) {
                // If we could have demolished, it was probably built in the first place
                case Sanitaire.barricadeActions.STOP_DEMOLISH:
                case Sanitaire.barricadeActions.START_BUILD:
                    // TODO: Date time math (use moment.js)
                    barrierStopsExistingTime = Infinity;
                    barrierExistsTime = latestEntry.time;
                    break;
                case Sanitaire.barricadeActions.START_DEMOLISH:
                    // Use negative infinity to mark that we don't know when it was existing,
                    // just that the barrier must have been existing sometime ago.
                    barrierExistsTime = -Infinity;
                    barrierStopsExistingTime = latestEntry.time;
                    break;
                case Sanitaire.barricadeActions.STOP_BUILD:
                    // If we stopped building, both barrier exists time and stop existing times
                    // should be infinity.
                    break;
            }
        }

        return {
            intersectionId: intersectionId,
            barrierExistsTime: barrierExistsTime,
            barrierStopsExistingTime: barrierStopsExistingTime
        }
    });

    // Check to see if any new barriers effect patient zero
    //var timeOfPath = SanitairePatientZero.estimateTimeDurationOfPath(game.patientZero.speed, game.patientZero.path.length);
    //var timeWhenPatientZeroArrives = new Date(game.patientZero.pathUpdatedAt.getTime() + timeOfPath);
    //
    //var pathSet = new Set(_.map(game.patientZero.path, function(tileXYI) {
    //    return tileXYI.x + ';' + tileXYI.y;
    //}));
    //
    //
    //if (_.any(barriers, function (barrier) {
    //        // Get the tiles
    //    })) {
    //    Sanitaire._changePatientZeroPath(gameId);
    //}

    // For now, just always recompute the path
    Sanitaire._changePatientZeroPath(gameId);

    Games.update(gameId, {
        $set: {
            barriers: barriers
        },
        $addToSet: {
            barriersLog: logEntry
        }
    });

    return true;
};