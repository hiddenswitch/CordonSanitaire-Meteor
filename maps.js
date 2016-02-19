/**
 * Created by jonathanbobrow on 12/14/15.
 */
SanitaireMaps = (Meteor.isClient ? window : global).Maps || {};

/**
 * Tiles for p-zero pathing and legal moves by players
 * @type {number[]}
 */
SanitaireMaps.PATHABLE_TILES = [8, 9, 10, 11, 12, 15, 33, 37, 38, 39];

SanitaireMaps.CROSSWALK_TILES = [8, 9, 10, 11];

/**
 * Tile colors for colored streets
 * @type {{NONE: number, EMPTY: number, RESPONDERS: number, CONTAINED: number, ISOLATED: number}}
 */
SanitaireMaps.streetColorTile = {
    NONE: 12,
    /**
     * Closed quarantine but noone inside. Color GREY
     */
    EMPTY: 33,
    /**
     * Only healthy people trapped. Color YELLOW
     */
    RESPONDERS: 38,
    /**
     * Patient Zero contained with healthy people. Color RED
     */
    CONTAINED: 37,
    /**
     * Patient Zero isolated. Color GREEN
     */
    ISOLATED: 39
};

/**
 * finds a random position on the roads (useful for finding a starting position)
 * @param roads {*} Array of roads and tiles contained from mapInfo
 * @returns {*} a Position {x,y} that is in the middle of a road
 */
SanitaireMaps.getRandomStartPosition = function (roads) {
    var address = parseInt(Math.floor(Math.random() * roads.length));
    var streetSize = roads[address].innerTiles.length;
    return roads[address].innerTiles[parseInt(streetSize / 2)];
};

/**
 * finds the Tile position of an intersection from its id
 * @param intersectionId {Number}
 * @param intersections {*} Array of intersections and related tiles
 */
SanitaireMaps.getIntersectionTilePositionForId = function(intersectionId, intersections) {

    var intersection = _.find(intersections, function(intersection) {
        return intersection.id == intersectionId;   // handles string or number comparison happily
    });
    return intersection.innerTiles[0];
};

/**
 *  Returns the id of an intersection given its coordinates and the intersections
 * @param x {Number}
 * @param y {Number}
 * @param intersections {*} Array of intersections from mapInfo
 * @returns {Number} Id of intersection
 */
SanitaireMaps.getIntersectionId = function (x, y, intersections) {
    for (var i = 0; i < intersections.length; i++) {
        // border tiles
        for (var j = 0; j < intersections[i].borderTiles.length; j++) {
            if (intersections[i].borderTiles[j].x === x && intersections[i].borderTiles[j].y === y)
                return intersections[i].id;
        }
        // inner tiles
        for (var j = 0; j < intersections[i].innerTiles.length; j++) {
            if (intersections[i].innerTiles[j].x === x && intersections[i].innerTiles[j].y === y)
                return intersections[i].id;
        }
    }
    return null;
};

/**
 *  Returns an array of border tiles given an intersections coordinates
 * @param x {Number}
 * @param y {Number}
 * @param intersections {*} Array of intersections from mapInfo
 * @returns {*} Array of borderTiles
 */
SanitaireMaps.getCrosswalkTiles = function (x, y, intersections) {
    for (var i = 0; i < intersections.length; i++) {
        for (var j = 0; j < intersections[i].borderTiles.length; j++) {
            if (intersections[i].borderTiles[j].x === x && intersections[i].borderTiles[j].y === y) {
                return intersections[i].borderTiles;
            }
        }
    }
    return null;
};

/**
 *  Returns the roadId of tile at the coordinates x,y
 * @param x {Number}
 * @param y {Number}
 * @param mapInfo {*} Array of all sorts of mapInfo
 * @returns {Number} Id of road found
 */
SanitaireMaps.getRoadIdForTilePosition = function (x, y, mapInfo) {
    //make sure x and y are integers
    x = Math.floor(x);//x|0;
    y = Math.floor(y);//y|0;
    var key = "(" + x + "," + y + ")";
    if(mapInfo.mapTiles[key].roadId) {
        return mapInfo.mapTiles[key].roadId;
    }
    return null;
};

/**
 *  Returns the id of an intersection given its Tile coordinates and the mapInfo
 * @param x {Number}
 * @param y {Number}
 * @param mapInfo {*} Array of all sorts of mapInfo
 * @returns {Number} Id of intersection
 */
SanitaireMaps.getIntersectionIdForTilePosition = function (x, y, mapInfo) {
    //make sure x and y are integers
    x = Math.floor(x);//x|0;
    y = Math.floor(y);//y|0;
    var key = "(" + x + "," + y + ")";
    if(mapInfo.mapTiles[key].intersectionId) {
        return mapInfo.mapTiles[key].intersectionId;
    }
    return null;
};

SanitaireMaps.getMapInfo = function (phaserTileMapInterface) {
    function isTileCrosswalk(tile) {
        // index of crosswalk tiles
        return (tile.index === 8 || tile.index === 9 || tile.index === 10 || tile.index === 11);
    }

    function isTileIntersection(tile) {
        return tile.index === 15;
    }

    function isTileRoad(tile) {
        return tile.index === 12;
    }

    function isTileQuarantine(tile) {
        return (tile.index === 13 || tile.index === 14);
    }

    // create a dictionary of all map tiles
    var mapInfo = {};
    var mapTiles = mapInfo.mapTiles = [];
    var NONEXISTENT = -1;

    for (var i = 0; i < phaserTileMapInterface.width; i++) {
        for (var j = 0; j < phaserTileMapInterface.height; j++) {
            var key = "(" + i + "," + j + ")";
            mapTiles[key] = {
                index: phaserTileMapInterface.getTile(i, j, 0).index,
                intersectionId: NONEXISTENT,
                roadId: NONEXISTENT
            };
        }
    }


    // label or group all intersections on the map
    var intersection_index = 0;
    var road_index = 0;
    for (var i = 0; i < phaserTileMapInterface.width; i++) {
        for (var j = 0; j < phaserTileMapInterface.height; j++) {
            var key = "(" + i + "," + j + ")";
            // add an intersection id for each intersection + crosswalk tile
            if (isTileIntersection(mapTiles[key]) || isTileCrosswalk(mapTiles[key])) // is intersection or crosswalk
            {
                // if N, W, neighbor is in an intersection, add this one to that collection
                var n_key = "(" + i + "," + (j - 1) + ")";
                var w_key = "(" + (i - 1) + "," + j + ")";
                var nw_key = "(" + (i - 1) + "," + (j - 1) + ")";
                var sw_key = "(" + (i - 1) + "," + (j + 1) + ")";

                // order from nw -> w -> sw -> n, same as the scan
                if (mapTiles[nw_key] &&
                    ( isTileIntersection(mapTiles[nw_key]) || isTileCrosswalk(mapTiles[nw_key]))
                    && mapTiles[nw_key].intersectionId != NONEXISTENT) {
                    mapTiles[key].intersectionId = mapTiles[nw_key].intersectionId;
                }
                else if (mapTiles[w_key] &&
                    ( isTileIntersection(mapTiles[w_key]) || isTileCrosswalk(mapTiles[w_key]))
                    && mapTiles[w_key].intersectionId != NONEXISTENT) {
                    mapTiles[key].intersectionId = mapTiles[w_key].intersectionId;
                }
                else if (mapTiles[sw_key] &&
                    ( isTileIntersection(mapTiles[sw_key]) || isTileCrosswalk(mapTiles[sw_key]))
                    && mapTiles[sw_key].intersectionId != NONEXISTENT) {
                    mapTiles[key].intersectionId = mapTiles[sw_key].intersectionId;
                }
                else if (mapTiles[n_key] &&
                    ( isTileIntersection(mapTiles[n_key]) || isTileCrosswalk(mapTiles[n_key]))
                    && mapTiles[n_key].intersectionId != NONEXISTENT) {
                    mapTiles[key].intersectionId = mapTiles[n_key].intersectionId;
                }
                else {
                    // intersection is of a new group
                    mapTiles[key].intersectionId = intersection_index;
                    intersection_index++;
                }
            }
            // add a road id for each road + crosswalk tile
            if (isTileRoad(mapTiles[key]) || isTileCrosswalk(mapTiles[key])) {
                var n_key = "(" + i + "," + (j - 1) + ")";
                var w_key = "(" + (i - 1) + "," + j + ")";

                if (mapTiles[n_key] &&
                    ( isTileRoad(mapTiles[n_key]) || isTileCrosswalk(mapTiles[n_key]))
                    && mapTiles[n_key].roadId != NONEXISTENT) {
                    mapTiles[key].roadId = mapTiles[n_key].roadId;
                }
                else if (mapTiles[w_key] &&
                    ( isTileRoad(mapTiles[w_key]) || isTileCrosswalk(mapTiles[w_key]))
                    && mapTiles[w_key].roadId != NONEXISTENT) {
                    mapTiles[key].roadId = mapTiles[w_key].roadId;
                }
                else {
                    // road is of a new group
                    mapTiles[key].roadId = road_index;
                    road_index++;
                }
            }
        }
    }

    // create a dictionary of all intersections, inner tiles and border tiles
    var numIntersections = intersection_index;
    var intersections = mapInfo.intersections = [];
    var intersectionsById = mapInfo.intersectionsById = {};
    var roadsById = mapInfo.roadsById = {};
    for (var i = 0; i < numIntersections; i++) {

        var innerTiles = [];
        var borderTiles = [];

        for (var j = 0; j < phaserTileMapInterface.width; j++) {
            for (var k = 0; k < phaserTileMapInterface.height; k++) {
                var key = "(" + j + "," + k + ")";
                if (mapTiles[key].intersectionId === i) {
                    if (isTileIntersection(mapTiles[key]))
                        innerTiles.push({x: j, y: k});
                    else if (isTileCrosswalk(mapTiles[key]))
                        borderTiles.push({x: j, y: k});
                }
            }
        }
        intersections.push({
            id: i,
            innerTiles: innerTiles,
            borderTiles: borderTiles
        });
    }

    // create a dictionary of all roads
    var numRoads = road_index;
    var roads = mapInfo.roads = [];

    for (var i = 0; i < numRoads; i++) {

        var innerTiles = [];
        var borderTiles = [];
        var intersectionIds = [];

        for (var j = 0; j < phaserTileMapInterface.width; j++) {
            for (var k = 0; k < phaserTileMapInterface.height; k++) {
                var key = "(" + j + "," + k + ")";
                if (mapTiles[key].roadId === i) {
                    if (isTileRoad(mapTiles[key]))
                        innerTiles.push({x: j, y: k});
                    else if (isTileCrosswalk(mapTiles[key])) {
                        borderTiles.push({x: j, y: k});
                        intersectionIds.push(mapTiles[key].intersectionId);
                    }
                }
            }
        }
        // only unique intersection ids
        intersectionIds = _.uniq(intersectionIds, function (v, k) {
            return v;
        });
        // create a road entry with intersection ids
        roads.push({
            id: i,
            innerTiles: innerTiles,
            borderTiles: borderTiles,
            intersectionIds: intersectionIds
        });
    }

    // create a roads by id for finding roads easily
    _.each(roads, function(road) {
        roadsById[road.id] = road;
    });

    // add roadIds to intersections, this will be helpful when constructing a graph
    for (var i = 0; i < intersections.length; i++) {
        var roadIds = [];
        for(var j = 0; j < intersections[i].borderTiles.length; j++) {
            var borderTile = intersections[i].borderTiles[j];
            var key = "(" + borderTile.x + "," + borderTile.y + ")";
            if (!_.contains(roadIds, mapTiles[key].roadId))   // only add if unique
                roadIds.push(mapTiles[key].roadId);
        }
        intersections[i].roadIds = roadIds;
        intersectionsById[intersections[i].id] = intersections[i];
    }

    return mapInfo;
};