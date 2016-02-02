/**
 * @author Jonathan Bobrow
 * © 2015 All Rights Reserved
 **/

Template.worldBoard.onRendered(function () {
    var renderer = this;
    var routeData = Router.current().data();
    var gameId = routeData.gameId;
    var localPlayerId = routeData.playerId;
    var game = Games.findOne(gameId);
    var localPlayer = Players.findOne(localPlayerId);
    var localPlayerState = {
        construction: {
            isBuilding: false,
            intersectionId: -1
        },
        health: 1.0
    };

    // scale everything a bit to up performance when moving the map
    var scaleValue = 1.75;
    var width = window.innerWidth / scaleValue;
    var height = window.innerHeight / scaleValue;

    var sprites = {};
    var barricades = [];
    var patientZeroSprite = null;
    var patientZeroWaypoint = 0;

    var updatePatientZeroVelocity = function (waypoint, path, speed) {
        return;
        var velocity = {x: 0, y: 0};

        var nextPoint = path[Math.min(waypoint + 1, path.length - 1)];
        var currentPoint = path[Math.min(waypoint, path.length - 1)];
        velocity.x = Math.max(-1, Math.min(1, (nextPoint.x - currentPoint.x))) * speed;
        velocity.y = Math.max(-1, Math.min(1, (nextPoint.y - currentPoint.y))) * speed;

        if (waypoint >= path.length - 1) {
            velocity.x = 0;
            velocity.y = 0;
        }
        patientZeroSprite.body.velocity.x = velocity.x;
        patientZeroSprite.body.velocity.y = velocity.y;
    };

    var updatePatientZeroPosition = function (tilePosition) {
        if(!tilePosition) return;
        patientZeroSprite.position.x = tilePosition.x * 16;
        patientZeroSprite.position.y = tilePosition.y * 16;
    };

    var initializeMeteor = function () {
        renderer.autorun(function () {
            if (this.initialized) {
                return;
            }

            var updatePlayer = function (player) {
                var sprite = sprites[player._id];
                sprite.body.velocity.x = player.velocity.x;
                sprite.body.velocity.y = player.velocity.y;

                // TODO: Whenever position changes, interpolate between the current estimated position and the new position from the server
                // TODO: Smooth to this position. Also, this position is by default something that comes from the network
                var diffX = 0;
                var diffY = 0;
                if (!_.isUndefined(player.updatedAt)) {
                    var deltaTime = (TimeSync.serverTime(new Date()) - player.updatedAt) / 1000.0;
                    // Fudged additional position change. It will be sensitive to physics.
                    // TODO: Handle physics problems here...
                    diffX = deltaTime * sprite.body.velocity.x;
                    diffY = deltaTime * sprite.body.velocity.y;
                }

                sprite.position.x = player.position.x + diffX;
                sprite.position.y = player.position.y + diffY;
            };

            var updateGame = function (id, fields) {
                _.each(fields, function (v, k) {
                    // See if a quarantine tile has been added
                    if (k === 'barriers') {
                        // Do the barriers update
                        var barriers = v;
                        var now = new Date(TimeSync.serverTime(new Date()));
                        _.each(barriers, function (barrier) {
                            var intersectionId = barrier.intersectionId;
                            if (barrier.barrierExistsTime <= now
                                && now <= barrier.barrierStopsExistingTime) {
                                // Draw a barrier for the given intersection
                                var intersection = currentMapInfo.intersectionsById[intersectionId];
                                for (var i = 0; i < intersection.borderTiles.length; i++) {
                                    var borderTile = intersection.borderTiles[i];
                                    addWallTile(borderTile.x, borderTile.y);
                                }
                            } else {
                                // Remove a barrier
                                var intersection = currentMapInfo.intersectionsById[intersectionId];
                                for (var i = 0; i < intersection.borderTiles.length; i++) {
                                    var borderTile = intersection.borderTiles[i];
                                    removeWallTile(borderTile.x, borderTile.y);
                                }
                            }
                        });

                        // Recalculate patient zero
                        var game = Games.findOne(gameId, {reactive: false});

                        var playerRoadIds = _.map(sprites, function (sprite) {
                            return SanitaireMaps.getRoadIdForTilePosition(
                                sprite.x / 16,
                                sprite.y / 16,
                                currentMapInfo
                            );
                        });

                        var patientZeroCurrentLocation = SanitairePatientZero.estimatePositionFromPath(game.patientZero.speed, game.patientZero.path, game.patientZero.pathUpdatedAt, {
                            time: new Date()
                        });

                        var patientZeroRoadId = SanitaireMaps.getRoadIdForTilePosition(patientZeroCurrentLocation.x, patientZeroCurrentLocation.y, currentMapInfo); // TODO: get actual road id from this game!!!!!!!
                        var mapGraph = getGraphRepresentationOfMap(currentMapInfo, game);
                        var isPZeroContained = GraphAnalysis.checkPatientZero(mapGraph, playerRoadIds, patientZeroRoadId);

                        //console.log("patient zero is " + (isPZeroContained?"isolated":"on the loose"));
                        // Update visible patient zero status
                        if (isPZeroContained) {
                            Session.set("patient zero isolated", true);
                            Session.set("patient zero contained", false);
                            Session.set("patient zero loose", false);
                        }
                        else {
                            Session.set("patient zero isolated", false);
                            Session.set("patient zero contained", false);
                            Session.set("patient zero loose", true);
                        }
                    }

                    //if (/^quarantine/.test(k)
                    //    && !_.isUndefined(v)) {
                    //    addWallTile(v.x, v.y);
                    //
                    //    // Check patient zero status
                    //    var game = Games.findOne(gameId, {reactive: false});
                    //
                    //    var playerRoadIds = _.map(sprites, function (sprite) {
                    //        return SanitaireMaps.getRoadIdForTilePosition(
                    //            sprite.x / 16,
                    //            sprite.y / 16,
                    //            currentMapInfo
                    //        );
                    //    });
                    //
                    //    var patientZeroCurrentLocation = SanitairePatientZero.estimatePositionFromPath(game.patientZero.speed, game.patientZero.path, game.patientZero.pathUpdatedAt, {
                    //        time: new Date()
                    //    });
                    //
                    //    var patientZeroRoadId = SanitaireMaps.getRoadIdForTilePosition(patientZeroCurrentLocation.x, patientZeroCurrentLocation.y, currentMapInfo); // TODO: get actual road id from this game!!!!!!!
                    //    var mapGraph = getGraphRepresentationOfMap(currentMapInfo, game);
                    //    var isPZeroContained = GraphAnalysis.checkPatientZero(mapGraph, playerRoadIds, patientZeroRoadId);
                    //
                    //    //console.log("patient zero is " + (isPZeroContained?"isolated":"on the loose"));
                    //    // Update visible patient zero status
                    //    if (isPZeroContained) {
                    //        Session.set("patient zero isolated", true);
                    //        Session.set("patient zero contained", false);
                    //        Session.set("patient zero loose", false);
                    //    }
                    //    else {
                    //        Session.set("patient zero isolated", false);
                    //        Session.set("patient zero contained", false);
                    //        Session.set("patient zero loose", true);
                    //    }
                    //}

                    // Has the patient zero updated at time changed? Do some moving
                    if (k === 'patientZero') {
                        var game = Games.findOne(gameId, {reactive: false});
                        // If we haven't created patient zero yet, create him
                        if (!patientZeroSprite) {
                            var patientZeroCurrentLocation = SanitairePatientZero.estimatePositionFromPath(game.patientZero.speed, game.patientZero.path, game.patientZero.pathUpdatedAt, {
                                time: new Date()
                            });

                            var patientZero = patientZeroSprite = phaserGame.add.sprite(patientZeroCurrentLocation.x * 16, patientZeroCurrentLocation.y * 16, 'patientZero', 1);
                            phaserGame.physics.enable(patientZero, Phaser.Physics.ARCADE);
                            patientZero.body.setSize(10, 14, 2, 1);
                        }

                        var speed = game.patientZero.speed;

                        var path = v.path || game.patientZero.path;
                        var pathUpdatedAt = v.pathUpdatedAt || game.patientZero.pathUpdatedAt;
                        var currentPosition = SanitairePatientZero.estimatePositionFromPath(speed, path, pathUpdatedAt, {
                            time: TimeSync.serverTime(new Date())
                        });

                        patientZeroWaypoint = currentPosition.i;

                        Deps.afterFlush(function () {
                            updatePatientZeroPosition(currentPosition);
                            updatePatientZeroVelocity(currentPosition.i, path, speed);
                        });
                    }
                });
            }


        this.playerUpdate = Players.find({gameId: Router.current().data().gameId}).observe({
            added: function (player) {
                sprites[player._id] = createSpriteForPlayer(player._id, {
                    isLocalPlayer: player._id === localPlayerId
                    //location: {"x": 16, "y": 96}
                });
                updatePlayer(player);
            },
            changed: function (player) {
                updatePlayer(player);
            },
            removed: function (player) {

            }
        });

        this.quarantineTiles = Games.find(gameId).observeChanges({
            added: function (id, fields) {
                // Add all the quarantine tiles
                updateGame(id, fields);
            },
            changed: function (id, fields) {
                updateGame(id, fields);
            }
        });

        this.initialized = true;
    });
};

var phaserGame = new Phaser.Game(width, height, Phaser.AUTO, 'gameboard', {
    preload: preload,
    create: create,
    update: update,
    render: render
});

function preload() {
    // load path to map from settings
    var filename = "Simple_40.csv";
    var mapPath = "/assets/tilemaps/csv/" + filename;
    phaserGame.load.tilemap('map', mapPath, null, Phaser.Tilemap.CSV);
    phaserGame.load.image('tiles', '/assets/tilemaps/tiles/Basic_CS_Map.png');
    phaserGame.load.image('barricade_horiz', '/assets/sprites/barricade_horiz.png');
    phaserGame.load.spritesheet('player', '/assets/sprites/cdc_man.png', 16, 16);
    phaserGame.load.spritesheet('patientZero', '/assets/sprites/patient_zero_0.png', 16, 16);
    phaserGame.load.spritesheet('button', '/assets/buttons/button_sprite_sheet.png', 193, 71);
    phaserGame.stage.disableVisibilityChange = true;
}

var map;
var layer;
var cursors;
var localPlayerSprite;
var player_direction;
var button;

var lastPromptTile = {index: 0, x: 0, y: 0};
var lastIntersectionId = -1;

// function to scale up the game to full screen
function goFullScreen() {
    phaserGame.scale.pageAlignHorizontally = true;
    phaserGame.scale.pageAlignVertically = true;
    phaserGame.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    phaserGame.stage.smoothed = false;
    // game.scale.setScreenSize(true);

    // nearest neighbor pixel rendering
    //Phaser.Canvas.setImageRenderingCrisp(true);
    //Phaser.Canvas.setSmoothingEnabled(this.game.context, false);
}

function create() {

    // let's scale to fullscreen
    goFullScreen();

    //  Because we're loading CSV map data we have to specify the tile size here or we can't render it
    map = phaserGame.add.tilemap('map', 16, 16);

    //  Now add in the tileset
    map.addTilesetImage('tiles');

    //  Create our layer
    layer = map.createLayer(0);

    //  Resize the world
    layer.resizeWorld();

    //  Simplified list of things that the player collides into
    //map.setCollisionBetween(0, 7, true, layer, true);  // walls + buildings
    //map.setCollisionBetween(13, 14, true, layer, true); // barricades
    map.setCollisionByExclusion([8,9,10,11,12,15], true, layer, true);

    //  Handle special tiles on gameboard (i.e. intersections)
    map.setTileIndexCallback(8, promptAtIntersection, this);
    map.setTileIndexCallback(9, promptAtIntersection, this);
    map.setTileIndexCallback(10, promptAtIntersection, this);
    map.setTileIndexCallback(11, promptAtIntersection, this);
    // quarantine tiles
    map.setTileIndexCallback(13, promptAtQuarantine, this);
    map.setTileIndexCallback(14, promptAtQuarantine, this);

    //  Un-comment this on to see the collision tiles
    // layer.debug = true;

    cursors = phaserGame.input.keyboard.createCursorKeys();

    // beginSwipe function
    phaserGame.input.onDown.add(beginSwipe, this);

    // Useful for adding an HUD
    // var help = game.add.text(16, 16, 'Arrows to move', { font: '14px Arial', fill: '#ffffff' });
    // help.fixedToCamera = true;

    //// add button for building quarantines (currently Handled in DOM)
    //button = phaserGame.add.button(width / 2 - 90, height - 80, 'button', addQuarantine, this, 2, 1, 0);
    //button.fixedToCamera = true;

    currentMapInfo = SanitaireMaps.getMapInfo(map);

    //TODO: create a node/edge representation of intersections and roads
    // This is sort of already done by adding intersections to the roads array
    // each road is an edge, containing the two nodes it connects

    var game = Games.findOne(gameId, {reactive: false});
    var mapGraph = getGraphRepresentationOfMap(currentMapInfo, game);

    initializeMeteor();
}

// return a graph of the map in the following form
//
//     var exampleGraph = {
//         'intersection id 1': ['interesction id 2', 'intersection id 4', 'intersection id 10'],
//         // notice that id 1 is connected to 4 and 4 is connected to 1
//         'intersection id 4': ['intersection id 1', 'intersection id 8'],
//…
//     }
getGraphRepresentationOfMap = function (currentMapInfo, game) {
    var graph = {};
    var blockedIntersectionIds = new Set(game.intersectionIds);

    currentMapInfo.roads.forEach(function (roadV) {
        if (!graph[roadV.id]) {
            graph[roadV.id] = [];
        }

        roadV.intersectionIds.forEach(function (intersectionId) {
            if (blockedIntersectionIds.has(intersectionId)) {
                return;
            }

            var intersection = currentMapInfo.intersectionsById[intersectionId];
            intersection.roadIds.forEach(function (roadUId) {
                graph[roadV.id] = _.uniq([roadUId].concat(graph[roadV.id]));
            });
        });
    });

    return graph;
}

var lastLocalPlayerWallCollisionHandled = null;

function update() {

    // Do patient zero
    var game = Games.findOne(gameId, {reactive: false});
    // Todo: temporary solution for end of game
    if(game) {
        var path = game.patientZero.path;
        updatePatientZeroPosition(SanitairePatientZero.estimatePositionFromPath(game.patientZero.speed, path, game.patientZero.pathUpdatedAt, {time: TimeSync.serverTime(new Date())}));
    }
    //var destination = path[Math.max(Math.min(patientZeroWaypoint + 1, path.length - 1), 0)];
    //destination.x *= 16;
    //destination.y *= 16;
    //var distanceToDestination = Math.sqrt(Math.pow(patientZeroSprite.position.x - destination.x, 2) + Math.pow(patientZeroSprite.position.y - destination.y, 2));
    //if (distanceToDestination < 4) {
    //    patientZeroSprite.position.x = destination.x;
    //    patientZeroSprite.position.y = destination.y;
    //    patientZeroWaypoint++;
    //    updatePatientZeroVelocity(patientZeroWaypoint, path, game.patientZero.speed);
    //}


    for (var playerId in sprites) {
        var sprite = sprites[playerId];

        // Do physics w/ layer
        phaserGame.physics.arcade.collide(sprite, layer, function () {
            // Only process the callback for local player
            if (playerId !== localPlayerId) {
                return;
            }

            // Have I already handled this particular collision event before?
            if (lastLocalPlayerWallCollisionHandled != null
                && lastLocalPlayerWallCollisionHandled.x === sprite.position.x
                && lastLocalPlayerWallCollisionHandled.y === sprite.position.y) {
                return;
            }
            // If so, don't repeat a message to meteor.
            // Otherwise, tell meteor about my change in velocity.

            Meteor.call('updatePositionAndVelocity', gameId, {
                x: sprite.position.x,
                y: sprite.position.y
            }, {
                x: 0,
                y: 0
            }, TimeSync.serverTime(new Date()));
        });

        // Do physics w/ barricades
        _.each(barricades, function(barricade) {
            phaserGame.physics.arcade.collide(sprite, barricade, function () {
                // Only process the callback for local player
                if (playerId !== localPlayerId) {
                    return;
                }

                // Have I already handled this particular collision event before?
                if (lastLocalPlayerWallCollisionHandled != null
                    && lastLocalPlayerWallCollisionHandled.x === sprite.position.x
                    && lastLocalPlayerWallCollisionHandled.y === sprite.position.y) {
                    return;
                }
                // If so, don't repeat a message to meteor.
                // Otherwise, tell meteor about my change in velocity.

                Meteor.call('updatePositionAndVelocity', gameId, {
                    x: sprite.position.x,
                    y: sprite.position.y
                }, {
                    x: 0,
                    y: 0
                }, TimeSync.serverTime(new Date()));
            });
        });


            // check if user has run to the end of the canvas and stop them if so
        if (playerId === localPlayerId) {
            if (sprite.body.position.x < 0
                || sprite.body.position.y < 0
                || sprite.body.position.x > map.widthInPixels - map.tileWidth
                || sprite.body.position.y > map.heightInPixels - map.tileHeight)
                Meteor.call('updatePositionAndVelocity', gameId, {
                    x: sprite.position.x,
                    y: sprite.position.y
                }, {
                    x: 0,
                    y: 0
                }, TimeSync.serverTime(new Date()));
        }

        // TODO: Update position on collide.

        // Do animations
        if (sprite.body.velocity.x > 0) {
            sprite.play('right');
        } else if (sprite.body.velocity.x < 0) {
            sprite.play('left');
        } else if (sprite.body.velocity.y > 0) {
            sprite.play('down');
        } else if (sprite.body.velocity.y < 0) {
            sprite.play('up');
        } else {
            sprite.play('idle');
            //sprite.animations.stop();
        }
    }

}

function render() {

    // game.debug.body(player);

}

/**
 * Set the player in motion given a specific direction
 * TODO: expand this to take player state for speed into account
 * @param direction
 */
function move(direction) {
    if (!sprites[localPlayerId]) {
        return;
    }

    var position = {
        x: sprites[localPlayerId].position.x,
        y: sprites[localPlayerId].position.y
    };

    // round the position to always be on the grid
    position.x = Math.floor((position.x + 8) / 16) * 16;
    position.y = Math.floor((position.y + 8) / 16) * 16;

    var velocity = {x: 0, y: 0};

    var speed = 100;    // TODO: attach this to a player wrt health

    switch (direction) {
        case 'left':
            velocity.x = -speed;
            break;
        case 'right':
            velocity.x = speed;
            break;
        case 'down':
            velocity.y = speed;
            break;
        case 'up':
            velocity.y = -speed;
            break;
        default:
            break;
    }

    Meteor.call('updatePositionAndVelocity', Router.current().data().gameId, position, velocity, TimeSync.serverTime(new Date()));
}

/**
 * Displays a prompt when we arrive at a specific tile
 * @param sprite
 * @param tile
 */

var prevPhysics = {};

function promptAtIntersection(sprite, tile) {
    // Only process the callback for local player
    if (sprite.playerId !== localPlayerId) {
        return;
    }
    /** TODO: move this logic for checks elsewhere, the function
     * should simply display the correct prompt (i.e. buttons when needed)
     *
     */

    var intersectionId = SanitaireMaps.getIntersectionId(tile.x, tile.y, currentMapInfo.intersections);
    if (lastIntersectionId === intersectionId)
        return;
    lastIntersectionId = intersectionId;

    if ((tile.x === lastPromptTile.x || tile.x === (lastPromptTile.x - 1) || tile.x === (lastPromptTile.x + 1))
        && (tile.y === lastPromptTile.y || tile.y === (lastPromptTile.y - 1) || tile.y === (lastPromptTile.y + 1)))
        return;

    lastPromptTile.index = tile.index;
    lastPromptTile.x = tile.x;
    lastPromptTile.y = tile.y;

    // show buttons for building
    Session.set("showing build buttons", true);
    Session.set("showing destroy button", false);

    prevPhysics = {
        direction: player_direction,
        position: {
            x: sprite.position.x,
            y: sprite.position.y
        },
        velocity: {
            x: sprite.body.velocity.x,
            y: sprite.body.velocity.y
        }
    }
    // stop our player (stops animation and movement)
    player_direction = '';

    // round the position to always be on the grid
    var pos ={
        x:Math.floor((sprite.position.x + 8) / 16) * 16,
        y:Math.floor((sprite.position.y + 8) / 16) * 16
    };

    Meteor.call('updatePositionAndVelocity', gameId, {
        x: pos.x,
        y: pos.y
    }, {
        x: 0,
        y: 0
    }, TimeSync.serverTime(new Date()));
}

/**
 * shows the correct prompt when arriving at a barricade/quarantine
 * @param sprite {Phaser.Sprite} a sprite object of the player at the barricade
 * @param tile {Phaser.Tile} the tile that triggered the prompt
 */
function promptAtQuarantine(sprite, tile) {
    // Only process the callback for local player
    if (sprite.playerId !== localPlayerId) {
        return;
    }

    var intersectionId = SanitaireMaps.getIntersectionId(tile.x, tile.y, currentMapInfo.intersections);
    if (lastIntersectionId === intersectionId)
        return;
    lastIntersectionId = intersectionId;

    if ((tile.x === lastPromptTile.x || tile.x === (lastPromptTile.x - 1) || tile.x === (lastPromptTile.x + 1))
        && (tile.y === lastPromptTile.y || tile.y === (lastPromptTile.y - 1) || tile.y === (lastPromptTile.y + 1)))
        return;

    lastPromptTile.index = tile.index;
    lastPromptTile.x = tile.x;
    lastPromptTile.y = tile.y;

    // show buttons for building
    Session.set("showing build buttons", true);
    Session.set("showing destroy button", true);

    prevPhysics = {
        direction: player_direction,
        position: {
            x: sprite.position.x,
            y: sprite.position.y
        },
        velocity: {
            x: sprite.body.velocity.x,
            y: sprite.body.velocity.y
        }
    }
    // stop our player (stops animation and movement)
    player_direction = '';

    // round the position to always be on the grid
    var pos ={
        x:Math.floor((sprite.position.x + 8) / 16) * 16,
        y:Math.floor((sprite.position.y + 8) / 16) * 16
    };

    Meteor.call('updatePositionAndVelocity', gameId, {
        x: pos.x,
        y: pos.y
    }, {
        x: 0,
        y: 0
    }, TimeSync.serverTime(new Date()));
}

/**
 * place build a quarantine on the corner that a player arrives at
 */
buildBarricade = function () {

    // hide buttons
    Session.set("showing build buttons", false);

    if (_.isUndefined(lastPromptTile)) {
        return;
    }
    // update all crosswalk tiles associated with this intersection
    var crosswalks = SanitaireMaps.getCrosswalkTiles(lastPromptTile.x, lastPromptTile.y, currentMapInfo.intersections);
    var intersectionId = SanitaireMaps.getIntersectionIdForTilePosition(crosswalks[0].x, crosswalks[0].y, currentMapInfo)
    // tell game we are starting to build a quarantine
    Meteor.call('startConstruction', gameId, intersectionId);
    // update state of player
    localPlayerState.construction.isBuilding = true;
    localPlayerState.construction.intersectionId = intersectionId;
};

/**
 * Send a message to log demolishing a barricade has begun
 */
demolishBarricade = function () {
    // hide buttons
    Session.set("showing build buttons", false);
    Session.set("showing destroy button", false);

    if (_.isUndefined(lastPromptTile)) {
        return;
    }
    // tell game we are starting to demolish a quarantine
    var crosswalks = SanitaireMaps.getCrosswalkTiles(lastPromptTile.x, lastPromptTile.y, currentMapInfo.intersections);
    var intersectionId = SanitaireMaps.getIntersectionIdForTilePosition(crosswalks[0].x, crosswalks[0].y, currentMapInfo)
    Meteor.call('startDeconstruciton', gameId, intersectionId, new Date());
    // update state of player
    localPlayerState.construction.isBuilding = true;
    localPlayerState.construction.intersectionId = intersectionId;
};

/**
 * Cancels the action (if this gui is available) and continues the player running in their
 * previous direction and velocity
 */
keepRunning = function () {

    // hide buttons
    Session.set("showing build buttons", false);
    Session.set("showing destroy button", false);

    if (!!prevPhysics) {
        Meteor.call('updatePositionAndVelocity', gameId, {
            x: prevPhysics.position.x,
            y: prevPhysics.position.y
        }, {
            x: prevPhysics.velocity.x,
            y: prevPhysics.velocity.y
        }, TimeSync.serverTime(new Date()));
    }
};

/**
 * Dismisses the option to demolish a barricade, and leave player standing still
 * if the GUI option is available
 */
cancelDestroy = function () {

    // TODO: make the buttons actually hide, not sure why they aren't right now
    // hide buttons
    Session.set("showing build buttons", false);
    Session.set("showing destroy button", false);
}

function addWallTile(positionX, positionY) {
    map.fill(13, positionX, positionY, 1, 1);
    // add a sprite barricade
    var barricade = phaserGame.add.tileSprite(positionX*16, positionY*16, 16, 16, 'barricade_horiz');
    barricades.push(barricade);
    phaserGame.physics.enable([sprites[localPlayerId], barricade], Phaser.Physics.ARCADE);
    barricade.body.moves = false;

    //Todo: To remove player from trapped position
    //Meteor.setTimeout(function() {
    //    // If I am in an illegal space, find the closest legal space to occupy
    //    var mySprite = sprites[localPlayerId];
    //    var currentTile = map.getTile(mySprite.x, mySprite.y, layer);
    //    if(currentTile.index != 12) { // if we aren't on a road
    //        if (currentTile.index == 15) {  // if we are in an intersection
    //            var intersectionId = SanitaireMaps.getIntersectionIdForTilePosition(positionX, positionY, currentMapInfo);
    //            //Todo: check if intersection is barricaded
    //            //if(intersectionId )
    //            // if so...
    //            // Iterate through neighboring tiles until you find a legal tile
    //            // Call the appropriate meteor method to place me in the legal tile}
    //        }
    //    }
    //},100);
}

function removeWallTile(positionX, positionY) {
    // Todo: get smart about crosswalk tile replacement
    map.fill(8, positionX, positionY, 1, 1);
    // Todo: find sprite at this position, remove this sprite.
    _.each(barricades, function(barricade) {
        if(barricade.x === positionX*16 && barricade.y === positionY*16) {
            barricade.kill();  // maybe destroy
        }
    });
}

// TODO: shows progress for specific intersection
//function showBuildProgress (intersectionId) {
//
//}

// when the player begins to swipe we only save mouse/finger coordinates, remove the touch/click
// input listener and add a new listener to be fired when the mouse/finger has been released,
// then we call endSwipe function
function beginSwipe() {
    startX = phaserGame.input.worldX;
    startY = phaserGame.input.worldY;
    phaserGame.input.onDown.remove(beginSwipe);
    phaserGame.input.onUp.add(endSwipe);
}

// function to be called when the player releases the mouse/finger
function endSwipe() {
    // if was in process of build or demo, send a message to stop the build action
    //if (localPlayerState.construction.isBuilding === true) {
    //    Meteor.call('stopConstruction', gameId, localPlayerState.construction.intersectionId);
    //    // make no longer in progress
    //    localPlayerState.construction.isBuilding = false;
    //    localPlayerState.construction.intersectionId = -1;
    //}

    // hide buttons
    Session.set("showing build buttons", false);

    // saving mouse/finger coordinates
    endX = phaserGame.input.worldX;
    endY = phaserGame.input.worldY;
    // determining x and y distance travelled by mouse/finger from the start
    // of the swipe until the end
    var distX = startX - endX;
    var distY = startY - endY;
    // in order to have an horizontal swipe, we need that x distance is at least twice the y distance
    // and the amount of horizontal distance is at least 10 pixels
    if (Math.abs(distX) > Math.abs(distY) * 2 && Math.abs(distX) > 10) {
        // moving left, calling move function with horizontal and vertical tiles to move as arguments
        if (distX > 0) {
            // TODO: Replace with Meteor.call
            move('left');
        }
        // moving right, calling move function with horizontal and vertical tiles to move as arguments
        else {
            move('right');
        }
    }
    // in order to have a vertical swipe, we need that y distance is at least twice the x distance
    // and the amount of vertical distance is at least 10 pixels
    if (Math.abs(distY) > Math.abs(distX) * 2 && Math.abs(distY) > 10) {
        // moving up, calling move function with horizontal and vertical tiles to move as arguments
        if (distY > 0) {
            move('up');
        }
        // moving down, calling move function with horizontal and vertical tiles to move as arguments
        else {
            move('down');
        }
    }

    // stop listening for the player to release finger/mouse, let's start listening for the player to click/touch
    phaserGame.input.onDown.add(beginSwipe);
    phaserGame.input.onUp.remove(endSwipe);
}

var createSpriteForPlayer = function (playerId, options) {
    options = _.extend({
        isLocalPlayer: false,
        location: {"x": 0, "y": 0}
    }, options);

    // set random position for yourself
    //if(options.isLocalPlayer)
    //var randomTile = getRandomStartPosition();
    //var startTile = {
    //    "x": options.isLocalPlayer && randomTile.x * 16 || 16,
    //    "y": options.isLocalPlayer && randomTile.y * 16 || 16,
    //}
    var player = phaserGame.add.sprite(options.location.x, options.location.y, 'player', 1);
    player.animations.add('left', [8, 9], 10, true);
    player.animations.add('right', [1, 2], 10, true);
    player.animations.add('up', [11, 12, 13], 10, true);
    player.animations.add('down', [4, 5, 6], 10, true);
    player.animations.add('idle', [15, 16, 17, 18], 5, true);
    player.smoothed = false;

    phaserGame.physics.enable(player, Phaser.Physics.ARCADE);

    player.body.setSize(10, 14, 2, 1);

    if (options.isLocalPlayer) {
        phaserGame.camera.follow(player);
    }

    player.playerId = playerId;

    return player;
};

}
)
;

Template.game.events({
    'click #buildButton': function () {
        // TODO: Make this smarter (it should be calling a meteor method)
        buildBarricade();
    },

    'click #destroyButton': function () {
        // TODO: Make this smarter (it should be calling a meteor method)
        demolishBarricade();
    },

    'click #cancelButton': function () {
        // TODO: Make this smarter (it should be calling a meteor method)
        if (Session.get("showing destroy button"))
            cancelDestroy();
        else
            keepRunning();
    }

});