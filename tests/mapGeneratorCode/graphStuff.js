/**
 * Created by Shinjini on 4/4/2016.
 */
var HOR_ROAD = -111;
var VER_ROAD = -112;
var UNKNOWN_ROAD = -113;
var STRAIGHT_ROADS = new Set([HOR_ROAD, VER_ROAD]);
var ROADS = new Set([HOR_ROAD, VER_ROAD, UNKNOWN_ROAD]);

var INTERSECTION1 = {
    "PLUS" : -210,
    "T_LEFT" : -30,
    "T_RIGHT" : -42,
    "T_UP" : -70,
    "T_DOWN" : -105,
    "UP_LEFT" : -10,
    "UP_RIGHT" : -14,
    "DOWN_RIGHT" : -21,
    "DOWN_LEFT" : -15,
};

var INTERSECTIONS = { // should never have -1
    "-210": "PLUS",
    "-30": "T_LEFT",
    "-42": "T_RIGHT",
    "-70": "T_UP",
    "-105": "T_DOWN",
    "-10": "UP_LEFT",
    "-14": "UP_RIGHT",
    "-21": "DOWN_RIGHT",
    "-15": "DOWN_LEFT",
};

var DEBUGGING = -333;

var IMPASSABLE = -888;

var TileType = {
    PASSABLE: new Set([HOR_ROAD, VER_ROAD, UNKNOWN_ROAD, DEBUGGING]),

    NOT_PASSABLE: new Set([IMPASSABLE])

};

for (var key in INTERSECTIONS){
    TileType.PASSABLE.add(parseInt(key));
}

var bfs = function (map, source, seen, tileType) {
    var component = []; // an array of all nodes from current. Node: [y,x]
    if (!seen.has(source)) {
        var nextLevel = new Set([source]);
    } else {
        var nextLevel = new Set();
    }

    while (nextLevel.size > 0) {
        var thisLevel = nextLevel;
        nextLevel = new Set();
        thisLevel.forEach(function (v) {

            if (!seen.has(v)) {
                seen.add(v);
                var next = [];
                v = v.split(",");
                v = [parseInt(v[0]),parseInt(v[1])];
                component.push(v);
                if ((v[0]>0) && tileType.has(map[v[0]-1][v[1]])){//up
                    var u = [v[0]-1, v[1]];
                    u = u.join();
                    if (!seen.has(u)) {
                        next.push(u);
                    }
                }
                if ((v[0]<map.length-1) && tileType.has(map[v[0]+1][v[1]])){//down
                    var u = [v[0]+1,v[1]];
                    u = u.join();
                    if (!seen.has(u)) {
                        next.push(u);
                    }
                }
                if ((v[1]>0) && tileType.has(map[v[0]][v[1]-1])){//left
                    var u = [v[0],v[1]-1];
                    u = u.join();
                    if (!seen.has(u)) {
                        next.push(u);
                    }
                }
                if ((v[1]<map[0].length-1) && tileType.has(map[v[0]][v[1]+1])){//right
                    var u = [v[0],v[1]+1];
                    u = u.join();
                    if (!seen.has(u)) {
                        next.push(u);
                    }
                }
                next.forEach(function (u) {
                    nextLevel.add(u);
                });
            }
        });
    }
    return component;
};

var findComponents = function(map, tileType){
    var seen = new Set();
    var components = [];
    for (var i = 0; i< map.length; i++){ // i is y is row
        for (var j = 0; j<map[0].length; j++){ // j is x is col
            if (tileType.has(map[i][j])){
                var source = [i,j];
                source = source.join();

                var component = bfs(map, source, seen, tileType);
                if (component.length>0){
                    components.push(component);
                }
            }
        }
    }
    return components;
};
