/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
Sanitaire.WORLD_WIDTH = 1;
Sanitaire.WORLD_HEIGHT = 1;

/**
 * Compute whether or not a given point is inside a given polygon
 * @param point {[Number]} An [x,y] coordinate
 * @param polygon {[[Number]]} An array of [x,y] coordinates
 * @returns {boolean} Returns true if the point is inside the polygon
 * @private
 */
Sanitaire._pointInsidePolygon = function (point, polygon) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        var xi = polygon[i][0], yi = polygon[i][1];
        var xj = polygon[j][0], yj = polygon[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

/**
 * Computes whether or not the given patient zero location is inside the given player documents
 * @param patientZeroLocation {{x: Number, y: Number}} A location as an x: y: dictionary
 * @param players {Player} An array of player documents
 * @returns {boolean} Returns true if patient zero's location is inside the given players
 * @private
 */
Sanitaire._patientZeroInsidePlayers = function (patientZeroLocation, players) {
    return Sanitaire._pointInsidePolygon([patientZeroLocation.x, patientZeroLocation.y], _.map(players, function (player) {
        return [player.location.x, player.location.y];
    }));
};

/**
 * Given a game document and time, return an evaluation of the path for patient zero
 * @param game {{patientZero: {path: [{x: Number, y: Number}]}}}
 * @param time
 * @returns {{x, y, t: Number}}
 */
Sanitaire.getCurrentPatientZeroLocation = function (game, time) {
    // TODO: Update this to support a path
    time = time || new Date();
    var t = Math.max(Math.min((Number(time) - Number(game.startAt)) / game.duration, 1), 0);
    var value = _.extend(game.patientZero.path[0], {t: t});
    return value;
};

/**
 * Compute if patient zero is in a given game's possibly existing cordon
 * @param gameId {String} The game ID
 * @param [time] {Date} World time, or now by default
 * @returns {Boolean} True if patient zero is inside a cordon
 */
Sanitaire._isPatientZeroIsolated = function (gameId, time) {
    time = time || new Date();
    var game = Games.findOne(gameId, {fields: {patientZero: 1, startAt: 1, duration: 1}});
    if (!game) {
        return;
    }

    var location = Sanitaire.getCurrentPatientZeroLocation(game, time);

    var players = Players.find({gameId: gameId}, {
        fields: {
            location: 1,
            connectedToPlayerId: 1,
            _id: 1
        }
    }).fetch();

    var playerPolygons = Sanitaire._findPolygonPlayers(players);

    return _.any(playerPolygons, function (polygon) {
        return Sanitaire._patientZeroInsidePlayers(location, polygon)
    });
};

/**
 * Given a list of players, return arrays of polygons that they form.
 * @param players
 */
Sanitaire._findPolygonPlayers = _.memoize(function (players) {
    var playersById = _.indexBy(players, '_id');
    // Convert to vertices for Tarjan's algorithm
    var verticies = _.map(players, function (player) {
        return new Vertex(player._id);
    });

    var verticiesByName = _.indexBy(verticies, 'name');

    // Add connections
    _.each(verticies, function (vertex) {
        var connectedToPlayerId = playersById[vertex.name].connectedToPlayerId;
        if (connectedToPlayerId) {
            vertex.connections.push(verticiesByName[connectedToPlayerId]);
        }
    });

    // Create a graph representing the player polygons
    var graph = new Graph(verticies);

    // Create the Tarjan's algorithm state
    var tarjan = new Tarjan(graph);

    tarjan.run();
    // Get the polygons
    var polygons = tarjan.scc;
    // Get the polygons (polys greater than 3 length of unique items) in terms of players
    return _.map(_.filter(polygons, function (polygon) {
        return polygon.length >= 3;
    }), function (polygon) {
        return _.map(polygon, function (vertex) {
            return playersById[vertex.name];
        });
    });
}, function (players) {
    // Return the sorted edge list as the hash function
    var hash = '';

    if (players.length === 0) {
        return hash;
    }

    for (var i = 0, n = players.length; i < n; i++) {
        var player = players[i];
        hash += player._id + ':' + player.connectedToPlayerId + '/';
    }

    return hash;
});

/**
 * Reset positions for a given gameId
 * @param gameId
 */
Sanitaire.resetPositionsInGame = function (gameId) {
    Players.find({gameId: gameId}).forEach(function (player) {
        Players.update(player._id, {
            $set: {
                location: Sanitaire.getRandomLocationOnBoard({gameId: gameId, distance: 30})
            }
        });
    });
};

/**
 * Get a random location on the game board, given certain constraints in options
 * @param options
 * @returns {{x: number, y: number}}
 */
Sanitaire.getRandomLocationOnBoard = function (options) {
    var defaultMargin = 0.15 * (Sanitaire.WORLD_WIDTH + Sanitaire.WORLD_HEIGHT) / 2;
    // Compute some good defaults for a random location on the board
    // This will use a bit of a margin away from the sides of the board to make it look nice
    // And this formula will enforce a certain minimum distance between players
    options = _.extend({
        gameId: null,
        distance: 0,
        width: Sanitaire.WORLD_WIDTH - defaultMargin * 2,
        height: Sanitaire.WORLD_HEIGHT - defaultMargin * 2,
        anchor: {x: defaultMargin, y: defaultMargin}
    }, options);

    var currentLocations = [];
    if (options.gameId) {
        // Get all the current locations if a game ID was specified
        var patientZeroLocation = Games.findOne(options.gameId).patientZero.location;
        currentLocations = _.compact([patientZeroLocation]
            .concat(_.pluck(Players.find({gameId: options.gameId}, {fields: {location: 1}}).fetch(), 'location')));
    }

    // Generate a random point until one is found at least distance away from all other locations
    var pt;
    for (var i = 0; i < 100; i++) {
        pt = {
            x: options.anchor.x + Math.random() * options.width,
            y: options.anchor.y + Math.random() * options.height
        };

        var withinAnyPoints = _.any(currentLocations, function (currentLocation) {
            return Math.sqrt(Math.pow(currentLocation.x - pt.x, 2) + Math.pow(currentLocation.y - pt.y, 2)) < options.distance;
        });

        if (!withinAnyPoints) {
            break;
        }
    }

    return pt;
};