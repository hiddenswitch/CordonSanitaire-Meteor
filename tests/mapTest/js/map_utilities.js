
var tileStack = [];

// get all intersection tiles at intersection
function getIntersectionTiles(currentTile){
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

function isTileInStack(tile) {
    for(t of tileStack) {
        if(t.x == tile.x && t.y == tile.y) {
            return true;
        }
    }
    return false;
}

// get all crosswalk tiles given an intersection
function getCrosswalkTiles(intersectionTiles){
    // look through tiles and keep an array of all crosswalk tiles
    for (tile of intersectionTiles) {
        // look for a crosswalk as neighbor (up, down, left, right)
    }
}

//function checks if tile is a crosswalk
function isTileCrosswalk(tile) {

    if(tile.index == 8 || tile.index == 9 || tile.index == 10 || tile.index == 11)
        return true;

    return false;
}

//function checks if a tile is an intersection
function isTileIntersection(tile) {

    if(tile.index == 15)
        return true;

    return false;
}