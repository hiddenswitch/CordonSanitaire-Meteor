/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
SanitairePatientZero = (Meteor.isClient ? window : global).SanitairePatientZero || {};

/**
 * The tiles that are pathable by Patient Zero. Note we omit the wall tile.
 * TODO: This should probably be stored in the map document
 * @type {number[]}
 */
SanitairePatientZero.PATHABLE_TILES = [8, 9, 10, 11, 12, 15];

SanitairePatientZero.CROSSWALK_TILES = [8, 9, 10, 11];

SanitairePatientZero.computeNewRoute = function (tiles, position, options) {
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
    var findPath = Meteor.wrapAsync(function () {
        easyStar.findPath.apply(easyStar, arguments);
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
    easyStar.setGrid(tiles);
    easyStar.setAcceptableTiles(SanitairePatientZero.PATHABLE_TILES);

    // Try to find a path until the number of tries available has been exhausted. A try may fail because the random
    // crosswalk destination chosen may not be reachable. To exhaustively check all crosswalks, the number of tries
    // should be equal to the number of crosswalks.
    var crosswalkIndices = _.shuffle(_.range(crosswalks.length));

    if (options.tryAll) {
        options.maxTries = crosswalks.length;
    }

    while (path == null
    && tries < options.maxTries
    && tries < crosswalks.length) {
        // Chooses a random crosswalk tile as a destination when the destination is not specified.
        var destination = options.destination || crosswalks[crosswalkIndices[tries]];

        // Use an A-Star pathfinding to path between the current location and the destination
        path = findPath(position.x, position.y, destination.x, destination.y);
        tries++;
    }


    // If null, a path could not be found after `maxTries` tries. If tryAll is enabled, you can interpret this to mean
    // that no path is possible.
    return path;
};