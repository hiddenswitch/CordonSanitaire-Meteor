/**
 * @author Jonathan Bobrow
 * © 2015 All Rights Reserved
 **/

/**
 * Draws a barricade
 * @param map {Phaser.Map} A phaser map
 * @param state {Number} A state from Sanitiare.barricadeStates
 * @param intersectionId {String|Number} An intersection ID
 * @param mapInfo {*} Map info containing all the lookup tables
 * @param playerGroup {Phaser.Group} Group of player sprites
 * @param prevPosition {Position} x and y properties
 * @param phaserGame {Phaser.Game}
 */
var drawBarricade = function (map, state, intersectionId, mapInfo, playerGroup, prevPosition, phaserGame) {
    var tile = mapInfo.intersectionsById[intersectionId].innerTiles[0];

    switch (state) {
        case Sanitaire.barricadeStates.BUILT:
            map.fill(13, tile.x, tile.y, 1, 1);
            // actually add a physical sprite
            //addBarricadeSpriteToTile(tile, prevPosition, playerGroup, phaserGame);
            break;
        case Sanitaire.barricadeStates.EMPTY:
            map.fill(15, tile.x, tile.y, 1, 1);
            // remove the physical sprite
            //removeBarricadeSpriteFromTile();
            break;
        case Sanitaire.barricadeStates.UNDER_CONSTRUCTION:
            // TODO: Choose a tile that represents under construction
            // TODO: Configure some animation
            // Currently using a tile with the number 1 written on it
            map.fill(17, tile.x, tile.y, 1, 1);
            break;
        case Sanitaire.barricadeStates.UNDER_DECONSTRUCTION:
            // TODO: Choose a tile that represents under deconstruction
            // TODO: Configure some animation
            // Currently using a tile with the number 2 written on it
            map.fill(18, tile.x, tile.y, 1, 1);
            break;
    }
};

/**
 *
 * @param tile
 * @param playerGroup
 * @param prevPosition
 * @param phaserGame
 */
var addBarricadeSpriteToTile = function(tile, playerGroup, prevPosition, phaserGame) {
    // create sprite for barricade
    // add sprite to game (actually phaserGame)
    var barricade = phaserGame.add.tileSprite(tile.x*16, tile.y*16, 16, 16, 'barricade_horiz');
    // move our player back to their prevBuildTile
    Meteor.call('updatePositionAndVelocity', gameId, {
        x: prevPosition.x*16,
        y: prevPosition.y*16
    }, {
        x: 0,
        y: 0
    }, TimeSync.serverTime(new Date()));
    // add collisions with players
    phaserGame.physics.enable(playerGroup, barricade);
};

/**
 *
 * @param map
 * @param intersectionId
 * @param mapInfo
 * @param playerSprites
 * @param localPlayerSprite
 * @param prevPosition
 * @param phaserGame
 */
var removeBarricadeSpriteFromTile = function() {
    // find sprite for barricade
    // remove sprite from game (actually phaserGame)
};

/**
 * Update the position of patient zero
 * @param patientZeroSprite {Phaser.Sprite} A Phaser sprite
 * @param tilePosition {{x: Number, y: Number}} A position in tile space where patient zero should be
 */
var updatePatientZeroPosition = function (patientZeroSprite, tilePosition) {
    if (!tilePosition) return;
    patientZeroSprite.position.x = tilePosition.x * 16;
    patientZeroSprite.position.y = tilePosition.y * 16;
};

/**
 * Update the sprites based on the given player document
 * @param sprites {Object.<String, Phaser.Sprite>} A dictionary of phaser sprites keyed by playerId
 * @param player {String} A playerId (found in the players collection)
 */
var updatePlayer = function (sprites, player) {
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

/**
 * Update the barriers
 * @param barriers
 * @param barricadeTimers
 * @param map
 * @param gameId
 * @param playerSprites
 * @returns {*}
 */
var updateBarriers = function (barriers, barricadeTimers, map, gameId, playerSprites, playerGroup, prevPosition, mapInfo, buildProgressBars, phaserGame) {
    // These barricades come from Sanitaire.addConstructionMessageToLog

    // Clear the previous timers
    _.each(barricadeTimers, function (timer) {
        Meteor.clearTimeout(timer);
    });

    // Clear array
    barricadeTimers.length = 0;

    _.each(barriers, function (barricade) {
        var intersectionId = barricade.intersectionId;
        // Interpret the barricade's current state, and set timers for the barricade's next
        // states.
        drawBarricade(map, barricade.state, barricade.intersectionId, currentMapInfo, playerGroup, prevPosition, phaserGame);
        var from = _.isUndefined(barricade.progress) ? null : barricade.progress;
        var to = barricade.time == Infinity ? null : (barricade.nextState === Sanitaire.barricadeStates.BUILT ? 1 : 0);
        updateBuildProgressBar(barricade.intersectionId, from, to, barricade.time, buildProgressBars, phaserGame, mapInfo);


        // Set new timer
        if (barricade.time > -Infinity
            && barricade.time < Infinity) {
            var transitionToNextState = function () {
                drawBarricade(map, barricade.nextState, barricade.intersectionId, currentMapInfo);
            };
            // Convert to local time
            var time = barricade.time - TimeSync.serverOffset();

            // Freeze the progress
            if (time === Infinity) {
                return;
            }

            // If the transition would have already occured according to server time,
            // make the next transition the one
            if (time < (new Date()).getTime()) {
                // Transition into the next state now
                transitionToNextState()
            } else {
                // Schedule a transition into the next state
                Deps.afterFlush(function () {
                    barricadeTimers.push(Meteor.setTimeout(function () {
                        transitionToNextState();
                    }, Math.min(0, time - (new Date().getTime()))))
                });
            }
        }
    });

    // Recalculate patient zero
    var game = Games.findOne(gameId, {reactive: false});

    var playerRoadIds = _.map(playerSprites, function (sprite) {
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
    return barriers;
};

/**
 * Update patient zero
 * @param gameId
 * @param patientZeroSprite
 * @param phaserGame
 * @param patientZeroFromGameDocument
 * @returns {{patientZeroSprite: *}}
 */
var updatePatientZero = function (gameId, patientZeroSprite, phaserGame, patientZeroFromGameDocument) {
    var game = Games.findOne(gameId, {reactive: false});
    // If we haven't created patient zero yet, create him
    if (!patientZeroSprite) {
        var patientZeroCurrentLocation = SanitairePatientZero.estimatePositionFromPath(game.patientZero.speed, game.patientZero.path, game.patientZero.pathUpdatedAt, {
            time: new Date()
        });

        patientZeroSprite = phaserGame.add.sprite(patientZeroCurrentLocation.x * 16, patientZeroCurrentLocation.y * 16, 'patientZero', 1);
        phaserGame.physics.enable(patientZeroSprite, Phaser.Physics.ARCADE);
        patientZeroSprite.body.setSize(10, 14, 2, 1);
    }

    var speed = game.patientZero.speed;

    var path = patientZeroFromGameDocument.path || game.patientZero.path;
    var pathUpdatedAt = patientZeroFromGameDocument.pathUpdatedAt || game.patientZero.pathUpdatedAt;
    var currentPosition = SanitairePatientZero.estimatePositionFromPath(speed, path, pathUpdatedAt, {
        time: TimeSync.serverTime(new Date())
    });

    Deps.afterFlush(function () {
        updatePatientZeroPosition(patientZeroSprite, currentPosition);
    });

    return {patientZeroSprite: patientZeroSprite};
};

/**
 * Building progress bars - show status of build
 * @param intersectionId {Number} which intersection we represent
 * @param x {Number} position to place in the x coord
 * @param y {Number} position to place in the y coord
 * @param game {Phaser.Game} the game to add the bars to
 * @param [startWidth=0] {Number}
 */
var addBuildProgressBar = function (intersectionId, x, y, phaserGame, buildProgressBars, startWidth) {
    // move the bar to the top middle of the square
    x += 8;

    var properties = {
        height: 3,
        width: 20,
        padding: 1
    };

    var bmd = phaserGame.add.bitmapData(properties.width, properties.height);
    bmd.ctx.beginPath();
    bmd.ctx.rect(0, 0, properties.width, properties.height);
    bmd.ctx.fillStyle = '#1E1E22';
    bmd.ctx.fill();

    var background = phaserGame.add.sprite(x, y, bmd);
    background.anchor.set(0.5);

    bmd = phaserGame.add.bitmapData(properties.width / 4 - properties.padding * 2, properties.height - properties.padding * 2);
    bmd.ctx.beginPath();
    bmd.ctx.rect(0, 0, properties.width, properties.height);
    bmd.ctx.fillStyle = '#F2E266';
    bmd.ctx.fill();

    var foreground = phaserGame.add.sprite(x - background.width / 2, y, bmd);
    foreground.anchor.y = 0.5;
    foreground.width = startWidth * background.width;

    buildProgressBars[intersectionId] = {
        x: x,
        y: y,
        intersectionId: intersectionId,
        background: background,
        foreground: foreground,
        tween: null
    };
};

/**
 * Update the build progress bar
 * @param intersectionId {String|Number} The intersection ID
 * @param from {Number} A value between 0 and 1 representing the normalized progress to start the tween at. If null,
 * uses the existing value
 * @param to {Number} A value between 0 and 1 representing the normalized progress to end the tween at. If null,
 * no tween
 * @param time {Number} The ticks when the tween should finish. Ignored if to is null
 * @param buildProgressBars {Object.<Number, *>} A dictionary of progress bar datums set by add build progress bar
 * @param phaserGame {Phaser.Game} The phaser game
 * @param mapInfo {*} The map info
 */
var updateBuildProgressBar = function (intersectionId, from, to, time, buildProgressBars, phaserGame, mapInfo) {
    if (!buildProgressBars[intersectionId]) {
        var innerTile = mapInfo.intersectionsById[intersectionId].innerTiles[0];
        addBuildProgressBar(intersectionId, innerTile.x * 16, innerTile.y * 16, phaserGame, buildProgressBars);
    }

    // update the foreground of the build progress bar to show construction
    var width = buildProgressBars[intersectionId].background.width;

    // Stop the tween if it already exists
    if (!!buildProgressBars[intersectionId].tween) {
        buildProgressBars[intersectionId].tween.stop();
        phaserGame.tweens.remove(buildProgressBars[intersectionId].tween);
    }


    if (!_.isNull(from)) {
        buildProgressBars[intersectionId].foreground.width = from * width;
    }

    if (!_.isNull(to)) {
        // to(properties, duration, ease, autoStart, delay, repeat, yoyo)
        var diff = time - TimeSync.serverTime(new Date());
        var properties = {width: width * to};
        var duration = Math.max(0.1, diff);
        var ease = Phaser.Easing.Linear.None;
        var autoStart = true;
        buildProgressBars[intersectionId].tween = phaserGame.add.tween(buildProgressBars[intersectionId].foreground).to(
            properties,
            duration,
            ease,
            autoStart
        );
    }
};

Template.worldBoard.onRendered(function () {
        var renderer = this;
        var routeData = Router.current().data();
        var gameId = routeData.gameId;
        var localPlayerId = routeData.playerId;
        var game = Games.findOne(gameId);
        var localPlayer = Players.findOne(localPlayerId);
        var localPlayerState = {
            construction: {
                prevPosition: {
                    x:-1,
                    y:-1,
                },
                isBuilding: false,
                intersectionId: -1
            },
            health: 1.0
        };

        // scale everything a bit to up performance when moving the map
        var scaleValue = 1.75;
        var width = window.innerWidth / scaleValue;
        var height = window.innerHeight / scaleValue;

        var playerSprites = {};   // this is our players list
        var playerGroup;    // Phaser.Group
        var barricades = [];
        // keep an array of build progress bars for each intersection
        var buildProgressBars = {};
        // This is a list of timers that are used to schedule when the barricade state transition occurs
        var barricadeTimers = [];
        var patientZeroSprite = null;

        var initializeMeteor = function () {
            renderer.autorun(function () {
                if (this.initialized) {
                    return;
                }

                var updateGame = function (id, fields) {
                    _.each(fields, function (v, k) {
                        // See if a quarantine tile has been added
                        if (k === 'barriers') {
                            updateBarriers(v, barricadeTimers, map, gameId, playerSprites, playerGroup, localPlayerState.construction.prevPosition, currentMapInfo, buildProgressBars, phaserGame);
                        } else
                        // Has the patient zero updated at time changed? Do some moving
                        if (k === 'patientZero') {
                            var __ret = updatePatientZero(gameId, patientZeroSprite, phaserGame, v);
                            patientZeroSprite = __ret.patientZeroSprite;
                        }
                    });
                };

                this.playerUpdate = Players.find({gameId: Router.current().data().gameId}).observe({
                    added: function (player) {
                        playerSprites[player._id] = createSpriteForPlayer(player._id, {
                            isLocalPlayer: player._id === localPlayerId
                        });
                        updatePlayer(playerSprites, player);
                    },
                    changed: function (player) {
                        updatePlayer(playerSprites, player);
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
            var filename = "Simple_Single_02.csv";
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
        var movesSincePrompt = 2;

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

            // Create a group to add player sprites to
            playerGroup = phaserGame.add.group();

            //  Simplified list of things that the player collides into
            //map.setCollisionBetween(0, 7, true, layer, true);  // walls + buildings
            //map.setCollisionBetween(13, 14, true, layer, true); // barricades
            map.setCollisionByExclusion([8, 9, 10, 11, 12, 15], true, layer, true);

            //  Handle special tiles on gameboard (i.e. intersections)
            //map.setTileIndexCallback(8, promptAtIntersection, this);
            //map.setTileIndexCallback(9, promptAtIntersection, this);
            //map.setTileIndexCallback(10, promptAtIntersection, this);
            //map.setTileIndexCallback(11, promptAtIntersection, this);
            // TODO: Set callbacks for tiles under construction / under deconstruction

            // barricade tiles
            map.setTileIndexCallback(13, promptAtIntersection, this);
            map.setTileIndexCallback(15, promptAtIntersection, this);
            map.setTileIndexCallback(17, promptAtIntersection, this);
            map.setTileIndexCallback(18, promptAtIntersection, this);

            // crosswalks
            map.setTileIndexCallback(8, promptAtCrosswalk, this);
            map.setTileIndexCallback(9, promptAtCrosswalk, this);
            map.setTileIndexCallback(10, promptAtCrosswalk, this);
            map.setTileIndexCallback(11, promptAtCrosswalk, this);

            //  Un-comment this on to see the collision tiles
            // layer.debug = true;

            cursors = phaserGame.input.keyboard.createCursorKeys();

            // beginSwipe function
            phaserGame.input.onDown.add(beginSwipe, this);

            currentMapInfo = SanitaireMaps.getMapInfo(map);

            // create a node/edge representation of intersections and roads
            // This is sort of already done by adding intersections to the roads array
            // each road is an edge, containing the two nodes it connects

            var game = Games.findOne(gameId, {reactive: false});
            var mapGraph = getGraphRepresentationOfMap(currentMapInfo, game);

            initializeMeteor();
        }

        // TODO: Use this or remove this (think it's gonna get wiped next commit)
        /**
         *  return a graph of the map in the following form
         *  var exampleGraph = { 'intersection id 1': ['interesction id 2', 'intersection id 4', 'intersection id 10'],
         *  notice that id 1 is connected to 4 and 4 is connected to 1
         *  'intersection id 4': ['intersection id 1', 'intersection id 8'],
         */
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
            if (game) {
                var path = game.patientZero.path;
                var patientZeroPosition = SanitairePatientZero.estimatePositionFromPath(game.patientZero.speed, path, game.patientZero.pathUpdatedAt, {time: TimeSync.serverTime(new Date())});
                updatePatientZeroPosition(patientZeroSprite, patientZeroPosition);
            }

            for (var playerId in playerSprites) {
                var sprite = playerSprites[playerId];

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
                _.each(barricades, function (barricade) {
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
            if (!playerSprites[localPlayerId]) {
                return;
            }

            // count moves
            movesSincePrompt++;

            var position = {
                x: playerSprites[localPlayerId].position.x,
                y: playerSprites[localPlayerId].position.y
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

            // if we are in the middls of building send a message that we stopped building
            var game = Games.findOne(Router.current().data().gameId);
            // get latest log entry from local user
            var myLastBarriersLogEntry = _.find(_.sortBy(game.barriersLog, function (logEntry) {
                    return -logEntry.time;
                }),
                function (logEntry) {
                    return logEntry.playerId === localPlayerId;
                }
            );

            // if log entry exists and is of type start build or demolish, then send a message to stop
            if (myLastBarriersLogEntry) {
                if (myLastBarriersLogEntry.type === Sanitaire.barricadeActions.START_BUILD) {
                    Meteor.call('stopConstruction', Router.current().data().gameId, myLastBarriersLogEntry.intersectionId);
                }
                else if (myLastBarriersLogEntry.type === Sanitaire.barricadeActions.START_DEMOLISH) {
                    Meteor.call('stopDeconstruction', Router.current().data().gameId, myLastBarriersLogEntry.intersectionId);
                }
            }
        }

        /**
         * Displays a prompt when we arrive at a specific tile
         * Shows the build or demolish button (possibly both)
         * @param sprite {Phaser.Sprite} This is our avatar
         * @param tile {Phaser.Tile}
         */
        function promptAtIntersection(sprite, tile) {
            // Only process the callback for local player
            if (sprite.playerId !== localPlayerId) {
                return;
            }

            var intersectionId = SanitaireMaps.getIntersectionId(tile.x, tile.y, currentMapInfo.intersections);

            if (lastIntersectionId === intersectionId && movesSincePrompt < 2) {
                return;
            }

            // only respond to callback if within 3 pixels of the center of the tile
            if (Math.abs((Math.floor(sprite.position.x) - 7) % 16) > 1 && Math.abs((Math.floor(sprite.position.y) - 7) % 16) > 1) {
                //console.log("close but not close enough");
                return;
            }

            var game = Games.findOne(gameId);
            // Something is broken with underscore, indexBy is undefined!
            var barricade = _.find(game.barriers, function (b) {
                // Do a double equals compare since once is strings and the other is ints
                return b.intersectionId == intersectionId;
            });

            // decide if to show buttons
            var shouldShowBuildButton = false;
            var shouldShowDestroyButton = false;

            // if the barricade record exists
            if(!!barricade) {
                if(barricade.state === Sanitaire.barricadeStates.UNDER_CONSTRUCTION
                    || barricade.state === Sanitaire.barricadeStates.UNDER_DECONSTRUCTION
                    || barricade.state === Sanitaire.barricadeStates.BUILT) {
                    console.log("X: no need to prompt, this should handled from a crosswalk");
                    return;
                }
                else if(barricade.state === Sanitaire.barricadeStates.EMPTY
                    || barricade.state === Sanitaire.barricadeStates.NONE) {
                    console.log("X: we should have the option to build at intersection ", intersectionId);

                    if (TimeSync.serverTime(new Date()) < barricade.time
                        || barricade.time == Infinity) {
                        shouldShowBuildButton = barricade.buttons === Sanitaire.barricadeButtons.BUILD;
                        shouldShowDestroyButton = barricade.buttons === Sanitaire.barricadeButtons.DESTROY;
                    } else {
                        shouldShowBuildButton = barricade.nextButtons === Sanitaire.barricadeButtons.BUILD;
                        shouldShowDestroyButton = barricade.nextButtons === Sanitaire.barricadeButtons.DESTROY;
                    }
                }
                else {
                    console.log("X: how did we get here?");
                    return;
                }
            }else {
                console.log("X: we should have the option to build at intersection ", intersectionId, ". It has never been built on.");

                shouldShowBuildButton = true;
                shouldShowDestroyButton = false;
            }

            // reset our catch for same intersection
            movesSincePrompt = 0;
            lastIntersectionId = intersectionId;


            Session.set("showing build buttons", shouldShowBuildButton);
            Session.set("showing destroy button", shouldShowDestroyButton);

            // stop our player (stops animation and movement)
            player_direction = '';

            // record the prompt tile
            lastPromptTile.index = tile.index;
            lastPromptTile.x = tile.x;
            lastPromptTile.y = tile.y;

            // round the position to always be on the grid
            var pos = {
                x: tile.x * 16,  // KEVIN HACK - Freeze player in the middle of the intersection
                y: tile.y * 16
                //x:Math.floor((sprite.position.x + 8) / 16) * 16,
                //y:Math.floor((sprite.position.y + 8) / 16) * 16
            };

            Meteor.call('updatePositionAndVelocity', gameId, {
                x: pos.x,
                y: pos.y
            }, {
                x: 0,
                y: 0
            }, TimeSync.serverTime(new Date()));
            return;

        };

        /**
         * Prompts when a player is entering a crosswalk tile
         * In the case of a barricade build on this intersection, display demo button
         * In the case of an empty intersection
         * @param sprite {Phaser.Sprite} this is our avatar, who just stepped on a crosswalk
         * @param tile {Phaser.Tile} a crosswalk tile that you just stepped on
         */
        promptAtCrosswalk = function (sprite, tile) {

            // Only process the callback for local player
            if (sprite.playerId !== localPlayerId) {
                return;
            }

            var intersectionId = SanitaireMaps.getIntersectionId(tile.x, tile.y, currentMapInfo.intersections);

            if (lastIntersectionId === intersectionId && movesSincePrompt < 2) {
                return;
            }

            // only respond to callback if within 3 pixels of the center of the tile
            if (Math.abs((Math.floor(sprite.position.x)-7) % 16) > 1 && Math.abs((Math.floor(sprite.position.y)-7) % 16) > 1) {
                //console.log("close but not close enough");
                return;
            }

            // get the intersection tile
            var intersectionTile = currentMapInfo.intersectionsById[intersectionId].innerTiles[0];

            var game = Games.findOne(gameId);
            // Something is broken with underscore, indexBy is undefined!
            var barricade = _.find(game.barriers, function (b) {
                // Do a double equals compare since once is strings and the other is ints
                return b.intersectionId == intersectionId;
            });

            // decide if to show buttons
            var shouldShowBuildButton = false;
            var shouldShowDestroyButton = false;

            // if the barricade is built then offer demolish
            if(!!barricade) {
                if(barricade.state === Sanitaire.barricadeStates.UNDER_CONSTRUCTION
                    || barricade.state === Sanitaire.barricadeStates.UNDER_DECONSTRUCTION
                    || barricade.state === Sanitaire.barricadeStates.BUILT) {
                    console.log("CW: prompting from crosswalk at intersection ", intersectionId, " with barricade: ", barricade);

                    if (TimeSync.serverTime(new Date()) < barricade.time
                        || barricade.time == Infinity) {
                        shouldShowBuildButton = barricade.buttons === Sanitaire.barricadeButtons.BUILD;
                        shouldShowDestroyButton = barricade.buttons === Sanitaire.barricadeButtons.DESTROY;
                    } else {
                        shouldShowBuildButton = barricade.nextButtons === Sanitaire.barricadeButtons.BUILD;
                        shouldShowDestroyButton = barricade.nextButtons === Sanitaire.barricadeButtons.DESTROY;
                    }

                    // reset our catch for same intersection
                    movesSincePrompt = 0;
                    lastIntersectionId = intersectionId;
                }
                else if(barricade.state === Sanitaire.barricadeStates.EMPTY
                    || barricade.state === Sanitaire.barricadeStates.NONE) {
                    console.log("CW: no need to prompt. Intersection ", intersectionId, " is empty.");
                    return;
                }
                else {
                    console.log("CW: how did we get here?");
                    return;
                }
            }
            else {
                console.log("CW: no need to prompt. Intersection ", intersectionId, " has never been built on.");
                return;
            }

            Session.set("showing build buttons", shouldShowBuildButton);
            Session.set("showing destroy button", shouldShowDestroyButton);

            // if we aren't showing buttons, no need to stop
            //if(!shouldShowBuildButton)
            //    return;

            // stop our player (stops animation and movement)
            player_direction = '';

            // record the prompt tile
            lastPromptTile.index = intersectionTile.index;
            lastPromptTile.x = intersectionTile.x;
            lastPromptTile.y = intersectionTile.y;

            // round the position to always be on the grid
            var pos = {
                x: tile.x * 16,  // KEVIN HACK - Freeze player in the middle of the intersection
                y: tile.y * 16
                //x:Math.floor((sprite.position.x + 8) / 16) * 16,
                //y:Math.floor((sprite.position.y + 8) / 16) * 16
            };

            Meteor.call('updatePositionAndVelocity', gameId, {
                x: pos.x,
                y: pos.y
            }, {
                x: 0,
                y: 0
            }, TimeSync.serverTime(new Date()));
            return;
        };

        /**
         * place build a quarantine on the corner that a player arrives at
         */
        buildBarricade = function () {

            // hide buttons
            Session.set("showing build buttons", false);

            if (_.isUndefined(lastPromptTile)) {
                return;
            }
            // Get the intersection we are interested in

            var intersectionId = SanitaireMaps.getIntersectionIdForTilePosition(lastPromptTile.x, lastPromptTile.y, currentMapInfo);
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
            var intersectionId = SanitaireMaps.getIntersectionIdForTilePosition(lastPromptTile.x, lastPromptTile.y, currentMapInfo);
            Meteor.call('startDeconstruction', gameId, intersectionId, new Date());
            // update state of player
            localPlayerState.construction.isBuilding = true;
            localPlayerState.construction.intersectionId = intersectionId;
        };


        /**
         *  when the player begins to swipe we only save mouse/finger coordinates, remove the touch/click
         *  input listener and add a new listener to be fired when the mouse/finger has been released,
         *  then we call endSwipe function
         */
        function beginSwipe() {
            startX = phaserGame.input.worldX;
            startY = phaserGame.input.worldY;
            phaserGame.input.onDown.remove(beginSwipe);
            phaserGame.input.onUp.add(endSwipe);
        }

        /**
         *  function to be called when the player releases the mouse/finger
         */
        function endSwipe() {
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

            var player = phaserGame.add.sprite(options.location.x, options.location.y, 'player', 1);
            // add this sprite to a group
            playerGroup.add(player);
            // add animations to the sprite
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

        /**
         * Show build progress
         * @param intersectionId {Number} id of an intersection to show progress at
         */
        var showBuildProgressBar = function (intersectionId) {
            // make build progress visible
            //buildProgressBars[intersectionId].background.visible = true;
            //buildProgressBars[intersectionId].foreground.visible = true;
        };

        /**
         * Hide build progress
         * @param intersectionId {Number} id of an intersection to hide progress at
         */
        var hideBuildProgressBar = function (intersectionId) {
            // make build progress visible
            //buildProgressBars[intersectionId].background.visible = false;
            //buildProgressBars[intersectionId].foreground.visible = false;
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