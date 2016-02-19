/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
SanitairePatientZero = (Meteor.isClient ? window : global).SanitairePatientZero || {};

/**
 * Some important P-zero pathing variables
 */
SanitairePatientZero.THINK_TICKRATE = 1000.0 / 6;

SanitairePatientZero._thinks = {};

/**
 * Compute a new route and returns the path
 * @param tiles {[[Number]]} A tile map of indices in row-major order (y, x order)
 * @param position {{x: number, y: number, [i]: number}} The start position to route from.
 * @param options {{}} Options
 * @param [options.destination] {{x: number, y: number}} The destination in tile coordinates. When null, generated
 * by selecting crosswalks at random
 * @param [options.crosswalks] {[[{x: number, y: number}]]} An array of crosswalks in row-major order (y, x order). If
 * not provided, generated in the function
 * @param [options.maxTries] {Number} The maximum number of random destinations to try when no destination is given
 * @param [options.tryAll] {Boolean} Whether to try all possible destinations. Generally this is the number of crosswalk
 * tiles.
 * @returns {[{x: Number, y: Number}]} An array of tile coordinates representing the path
 */
SanitairePatientZero.computeNewRoute = function (tiles, position, options) {
    if (Meteor.isClient) {
        return [position];
    }

    options = _.extend({
        destination: null,
        crosswalks: null,
        maxTries: 10,
        tryAll: true
    }, options);

    var path = null;
    var height = tiles.length;
    var width = tiles[0].length;
    var crosswalks = options.crosswalks;
    var tries = 0;
    var easyStar = new EasyStar.js();
    var findPath = Meteor.wrapAsync(function (startX, startY, endX, endY, callback) {
        easyStar.findPath(startX, startY, endX, endY, function (path) {
            callback(null, path);
        });

        easyStar.calculate();
    });

    // Find all the crosswalks if we were not given a memo
    if (!crosswalks) {
        crosswalks = [];

        var crosswalkTiles = _.object(SanitairePatientZero.CROSSWALK_TILES, []);

        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                if (tiles[y][x] in crosswalkTiles) {
                    crosswalks.push({x: x, y: y});
                }
            }
        }
    }

    // Set up easyStar
    easyStar.enableSync();
    easyStar.setGrid(tiles);
    easyStar.setAcceptableTiles(SanitaireMaps.PATHABLE_TILES);

    // Try to find a path until the number of tries available has been exhausted. A try may fail because the random
    // crosswalk destination chosen may not be reachable. To exhaustively check all crosswalks, the number of tries
    // should be equal to the number of crosswalks.
    var crosswalkIndices = _.shuffle(_.range(crosswalks.length));

    if (options.tryAll) {
        options.maxTries = crosswalks.length;
    }

    while ((path == null || path.length === 0)
    && tries < options.maxTries
    && tries < crosswalks.length) {
        // Chooses a random crosswalk tile as a destination when the destination is not specified.
        var destination = options.destination || crosswalks[crosswalkIndices[tries]];

        // Use an A-Star pathfinding to path between the current location and the destination
        try {
            path = findPath(position.x, position.y, destination.x, destination.y);
        } catch (e) {
            console.error(e.stack);
        }

        tries++;
    }


    // If null, a path could not be found after `maxTries` tries. If tryAll is enabled, you can interpret this to mean
    // that no path is possible.
    return path;
};

/**
 * Get a random start position for a patient zero in the given map
 * @param options {{}}
 * @param options.mapId {string} The ID of the map to find a position in
 */
SanitairePatientZero.getStartPosition = function (options) {
    return Sanitaire.getRandomPositionInMap(options);
};

/**
 * Calculate an estimate of the current position of patient zero given a start position, a speed, the path, and
 * the start time.
 * @param speed {Number} A speed in phaser physics pixels per second
 * @param path {[{x: number, y: number}]} A path
 * @param startTime {Date}
 * @param [options] {{}}
 * @param [options.time] {Date} The time to calculate a position for. Defaults to the current time.
 * @param [options.tileSize=16] {Number} The size of a tile. Defaults to 16.
 */
SanitairePatientZero.estimatePositionFromPath = function (speed, path, startTime, options) {
    options = _.extend({
        time: new Date(),
        tileSize: 16
    }, options);

    // If no path is given, the position is unknown from this function
    if (!path
        || path.length == 0) {
        return null;
    }

    // Since each item in the path is 16 units in movement, we can just estimate the distance traveled so far and
    // get the appropriate index
    var tilesTraveled = Math.floor(((options.time - startTime) / 1000) * (speed / options.tileSize));
    var index = Math.max(Math.min(path.length - 1, tilesTraveled), 0);
    return _.extend(path[index], {i: index});
};

/**
 * Returns an estimate in milliseconds of how long it takes patient zero to travel this path from start to finish
 * @param speed {Number} A speed in phaser physics pixels per second
 * @param pathLength {Number} The number of steps in the path
 * @returns {Number} The estimated time in milliseconds to complete the path
 */
SanitairePatientZero.estimateTimeDurationOfPath = function (speed, pathLength, options) {
    options = _.extend({
        startIndex: 0
    }, options);

    if (!pathLength
        || pathLength == 0) {
        return null;
    }

    return 1000 * (pathLength - options.startIndex) * 16 / speed;
};

SanitairePatientZero.think = function (gameId) {
    if (Meteor.isClient) {
        return;
    }

    var timerId = Meteor.setInterval(function () {
        var game = Games.findOne(gameId);

        // If the game has ended, stop thinking
        if (game.state === Sanitaire.gameStates.ENDED) {
            SanitairePatientZero.stopThink(gameId);
            return;
        }

        // Check the position of patient zero. If we have arrived at our destination, compute a new path.
        var currentPath = game.patientZero.path;
        if (currentPath == null) {
            // TODO: What if we get a null path??
            return;
        }
        var destination = currentPath[currentPath.length - 1];
        var patientZeroPosition = SanitairePatientZero.estimatePositionFromPath(game.patientZero.speed, currentPath, game.patientZero.pathUpdatedAt);
        // Distance is in tile units
        var distanceToDestination = Math.sqrt(Math.pow(patientZeroPosition.x - destination.x, 2) + Math.pow(patientZeroPosition.y - destination.y, 2));
        if (distanceToDestination < 0.5) {
            Sanitaire._changePatientZeroPath(game);
        }
    }, SanitairePatientZero.THINK_TICKRATE);

    SanitairePatientZero._thinks[gameId] = timerId;
};

SanitairePatientZero.stopThink = function (gameId) {
    Meteor.clearInterval(SanitairePatientZero._thinks[gameId]);
};

Meteor.startup(function () {
    if (Meteor.isClient) {
        return;
    }

    // Resume thinking for games that are in progress
    Games.find({state: Sanitaire.gameStates.IN_PROGRESS}, {fields: {_id: 1}}).forEach(function (game) {
        SanitairePatientZero.think(game._id);
    });
});