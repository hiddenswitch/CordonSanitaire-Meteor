/**
 * @author Jonathan Bobrow
 * © 2015 All Rights Reserved
 **/

var tileStack = [];

/**
 * Gets all intersection tiles at intersection from a
 * starting interior or adjacent tile
 * @param currentTile
 */
function getIntersectionTiles(currentTile) {
    //tileStack = [{x: currentTile.x, y: currentTile.y}];

    // look through tiles and keep an array of all intersection tiles
    // look up, down, left, right... if intersection tile, add it to array and
    var above = map.getTileAbove(0, currentTile.x, currentTile.y);
    var below = map.getTileBelow(0, currentTile.x, currentTile.y);
    var left = map.getTileLeft(0, currentTile.x, currentTile.y);
    var right = map.getTileRight(0, currentTile.x, currentTile.y);

    // if tile is intersection and not yet in the stack
    if(isTileIntersection(above) && !isTileInStack(above)) {
        console.log("(" + above.x + ", " + above.y + ") is an intersection");
        // add to stack
        tileStack.push({x: above.x, y: above.y});
        getIntersectionTiles(above);
    }
    if(isTileIntersection(below) && !isTileInStack(below)) {
        console.log("(" + below.x + ", " + below.y + ") is an intersection");
        // add to stack
        tileStack.push({x: below.x, y: below.y});
        getIntersectionTiles(below);
    }
    if(isTileIntersection(left) && !isTileInStack(left)) {
        console.log("(" + left.x + ", " + left.y + ") is an intersection");
        // add to stack
        tileStack.push({x: left.x, y: left.y});
        getIntersectionTiles(left);
    }
    if(isTileIntersection(right) && !isTileInStack(right)) {
        console.log("(" + right.x + ", " + right.y + ") is an intersection");
        // add to stack
        tileStack.push({x: right.x, y: right.y});
        getIntersectionTiles(right);
    }
}

/**
 * Checks to see if the tile is already in the stack
 * @param tile
 * @returns {boolean}
 */
function isTileInStack(tile) {
    for(t of tileStack) {
        if(t.x == tile.x && t.y == tile.y) {
            return true;
        }
    }
    return false;
}

/**
 * Gets all crosswalk tiles given an intersection
 * @param intersectionTiles
 * @returns {Array}
 */
function getCrosswalkTiles(intersectionTiles){
    var crosswalkTiles = [];

    // look through tiles and keep an array of all crosswalk tiles
    for (tile of intersectionTiles) {
        // look for a crosswalk as neighbor (up, down, left, right)
    }

    return crosswalkTiles;
}

/**
 * Checks if tile is a crosswalk
 * @param tile
 * @returns {boolean}
 */
function isTileCrosswalk(tile) {

    // index of crosswalk tiles
    if(tile.index == 8 || tile.index == 9 || tile.index == 10 || tile.index == 11)
        return true;

    return false;
}

/**
 * Checks if a tile is an intersection
 * @param tile
 * @returns {boolean}
 */
function isTileIntersection(tile) {

    if(tile.index == 15)    // index of intersection tiles
        return true;

    return false;
}