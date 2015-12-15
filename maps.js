/**
 * Created by jonathanbobrow on 12/14/15.
 */
SanitaireMaps = (Meteor.isClient ? window : global).Maps || {};

SanitaireMaps.getRandomStartPosition = function (roads) {
    var address = parseInt(Math.floor(Math.random() * roads.length));
    var streetSize = roads[address].innerTiles.length;
    return roads[address].innerTiles[parseInt(streetSize / 2)];
};

SanitaireMaps.getIntersectionId = function (x, y, intersections) {
    for (var i = 0; i < intersections.length; i++) {
        for (var j = 0; j < intersections[i].borderTiles.length; j++) {
            if (intersections[i].borderTiles[j].x === x && intersections[i].borderTiles[j].y === y)
                return intersections[i].id;
        }
    }
    return null;
};

SanitaireMaps.getCrosswalkTiles = function (x, y, intersections) {
    for (var i = 0; i < intersections.length; i++) {
        for (var j = 0; j < intersections[i].borderTiles.length; j++) {
            if (intersections[i].borderTiles[j].x === x && intersections[i].borderTiles[j].y === y)
                return intersections[i].borderTiles;
        }
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

    // create a dictionary of all map tiles
    var mapInfo = {};
    var mapTiles = mapInfo.mapTiles = [];
    var NONEXISTENT = -1;

    for (var i = 0; i < phaserTileMapInterface.width; i++) {
        for (var j = 0; j < phaserTileMapInterface.height; j++) {
            var key = "(" + i + "," + j + ")";
            mapTiles[key] = {
                index: phaserTileMapInterface.getTile(i, j, 0).index,
                intersection: NONEXISTENT,
                road: NONEXISTENT
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
                    && mapTiles[nw_key].intersection != NONEXISTENT) {
                    mapTiles[key].intersection = mapTiles[nw_key].intersection;
                }
                else if (mapTiles[w_key] &&
                    ( isTileIntersection(mapTiles[w_key]) || isTileCrosswalk(mapTiles[w_key]))
                    && mapTiles[w_key].intersection != NONEXISTENT) {
                    mapTiles[key].intersection = mapTiles[w_key].intersection;
                }
                else if (mapTiles[sw_key] &&
                    ( isTileIntersection(mapTiles[sw_key]) || isTileCrosswalk(mapTiles[sw_key]))
                    && mapTiles[sw_key].intersection != NONEXISTENT) {
                    mapTiles[key].intersection = mapTiles[sw_key].intersection;
                }
                else if (mapTiles[n_key] &&
                    ( isTileIntersection(mapTiles[n_key]) || isTileCrosswalk(mapTiles[n_key]))
                    && mapTiles[n_key].intersection != NONEXISTENT) {
                    mapTiles[key].intersection = mapTiles[n_key].intersection;
                }
                else {
                    // intersection is of a new group
                    mapTiles[key].intersection = intersection_index;
                    intersection_index++;
                }
            }
            // add a road id for each road + crosswalk tile
            if (isTileRoad(mapTiles[key]) || isTileCrosswalk(mapTiles[key])) {
                var n_key = "(" + i + "," + (j - 1) + ")";
                var w_key = "(" + (i - 1) + "," + j + ")";

                if (mapTiles[n_key] &&
                    ( isTileRoad(mapTiles[n_key]) || isTileCrosswalk(mapTiles[n_key]))
                    && mapTiles[n_key].road != NONEXISTENT) {
                    mapTiles[key].road = mapTiles[n_key].road;
                }
                else if (mapTiles[w_key] &&
                    ( isTileRoad(mapTiles[w_key]) || isTileCrosswalk(mapTiles[w_key]))
                    && mapTiles[w_key].road != NONEXISTENT) {
                    mapTiles[key].road = mapTiles[w_key].road;
                }
                else {
                    // road is of a new group
                    mapTiles[key].road = road_index;
                    road_index++;
                }
            }
        }
    }

    // create a dictionary of all intersections, inner tiles and border tiles
    var numIntersections = intersection_index;
    var intersections = mapInfo.intersections = [];

    for (var i = 0; i < numIntersections; i++) {

        var innerTiles = [];
        var borderTiles = [];

        for (var j = 0; j < phaserTileMapInterface.width; j++) {
            for (var k = 0; k < phaserTileMapInterface.height; k++) {
                var key = "(" + j + "," + k + ")";
                if (mapTiles[key].intersection === i) {
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
                if (mapTiles[key].road === i) {
                    if (isTileRoad(mapTiles[key]))
                        innerTiles.push({x: j, y: k});
                    else if (isTileCrosswalk(mapTiles[key])) {
                        borderTiles.push({x: j, y: k});
                        intersectionIds.push(mapTiles[key].intersection);
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
            intersectionsIds: intersectionIds
        });
    }

    return mapInfo;
};