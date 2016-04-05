/**
 * Created by Shinjini on 4/4/2016.
 */


var bfs = function (map, source, seen) {
    console.log(seen.size);
    var component = new Set(); // a set of all nodes from current
    if (!seen.has(source)) {
        var nextLevel = new Set([source]);
    } else {
        var nextLevel = new Set();
    }

    while (nextLevel.size > 0) {
        var thisLevel = nextLevel;
        nextLevel = new Set();
        thisLevel.forEach(function (v) {
            //console.log(seen.size);
            //console.log(seen);

            if (!seen.has(v)) {
                //console.log(seen);
                //console.log(v);
                component.add(v);
                seen.add(v);
                var next = [];
                v = v.split(",");
                v = [parseInt(v[0]),parseInt(v[1])];
                if ((v[0]>0) && (map[v[0]-1][v[1]] === 0)){//up
                    var u = [v[0]-1, v[1]];
                    if (!seen.has(u)) {
                        next.push(u);
                    }
                }
                if ((v[0]<map.length-1) && (map[v[0]+1][v[1]] === 0)){//down
                    var u = [v[0]+1,v[1]];
                    if (!seen.has(u)) {
                        next.push(u);
                    }
                }
                if ((v[1]>0) && (map[v[0]][v[1]-1] === 0)){//left
                    var u = [v[0],v[1]-1];
                    if (!seen.has(u)) {
                        next.push(u);
                    }
                }
                if ((v[1]<map.length-1) && (map[v[0]][v[1]+1] === 0)){//right
                    var u = [v[0],v[1]+1];
                    if (!seen.has(u)) {
                        next.push(u);
                    }
                }
                //console.log(next);
                next.forEach(function (u) {
                    nextLevel.add(u.join());
                });
            }
        });
    }
    return component;
};

var findComponents = function(map){
    var seen = new Set();
    //console.log(seen);
    var components = [];
    for (var i = 0; i< map.length; i++){
        for (var j = 0; j<map[0].length; j++){
            if (map[i][j] === 0){
                var source = [i,j];
                source = source.join();
                var component = bfs(map, source, seen);
                if (component.size>0){
                    components.push(component);
                }
            }
        }
    }
    return components;
};
