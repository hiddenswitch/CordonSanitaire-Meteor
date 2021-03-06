/**
 * @author Jonathan Bobrow
 * © 2015 All Rights Reserved
 **/

// Manage if buttons are available
var buildButtonAvailable = false;
var demolishButtonAvailable = false;

/**
 * Color the road at a specific id to show quarantine state
 * @param map {Phaser.Map} A phaser map
 * @param roadId {Number} Id of a road to change the color of
 * @param mapInfo {*} Map info containing all the lookup tables
 * @param tileState {GraphAnalysis.roadStatus} status of road to determine color
 */
var updateRoadTiles = function (map, roadId, mapInfo, tileState) {

    var newTileColor;
    switch (tileState) {
        case GraphAnalysis.roadStatus.OPEN:
            newTileColor = SanitaireMaps.streetColorTile.NONE;
            break;
        case GraphAnalysis.roadStatus.CLOSED_EMPTY:
            newTileColor = SanitaireMaps.streetColorTile.NONE;
            break;
        case GraphAnalysis.roadStatus.CLOSED_RESPONDERS:
            newTileColor = SanitaireMaps.streetColorTile.NONE;
            break;
        case GraphAnalysis.roadStatus.CLOSED_CONTAINED:
            newTileColor = SanitaireMaps.streetColorTile.YELLOW;
            break;
        case GraphAnalysis.roadStatus.CLOSED_ISOLATED:
            newTileColor = SanitaireMaps.streetColorTile.GREEN;
            break;
        default:
            newTileColor = SanitaireMaps.streetColorTile.NONE;
    }
    _.each(mapInfo.roadsById[roadId].innerTiles, function (tile) {
        var currentTileColor = map.getTile(tile.x, tile.y).index;

        if (currentTileColor != newTileColor) {
            // check the other road tiles now that there are more
            if (!(newTileColor === SanitaireMaps.streetColorTile.NONE
                && _.indexOf(SanitaireMaps.ROAD_TILES, currentTileColor) != -1)) {

                // only color tiles that need to be recolored
                map.fill(newTileColor, tile.x, tile.y, 1, 1);
            }
        }
    });
};

/**
 * Lets the server know to stop our player just got stopped
 * @param gameId {String}
 * @param sprite {Phaser.Sprite}
 */
var stopLocalPlayer = function (gameId, sprite) {
    // set our velocity to zero
    Meteor.call('updatePositionAndVelocity', gameId, {
        x: sprite.position.x,
        y: sprite.position.y
    }, {
        x: 0,
        y: 0
    }, TimeSync.serverTime(new Date()));
};

/**
 * Draws a barricade
 * @param map {Phaser.Map} A phaser map
 * @param state {Number} A state from Sanitiare.barricadeStates
 * @param intersectionId {String|Number} An intersection ID
 * @param mapInfo {*} Map info containing all the lookup tables
 */
var drawBarricade = function (map, state, intersectionId, mapInfo) {
    var tile = mapInfo.intersectionsById[intersectionId].innerTiles[0];

    switch (state) {
        case Sanitaire.barricadeStates.BUILT:
            map.fill(13, tile.x, tile.y, 1, 1);
            break;
        case Sanitaire.barricadeStates.EMPTY:
            map.fill(15, tile.x, tile.y, 1, 1);
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
 * Update the sprites based on the given player document
 * @param sprites {Object.<String, Phaser.Sprite>} A dictionary of phaser sprites keyed by playerId
 * @param player {Object} Player from collection (db)
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
 * @param playerGroup
 * @param mapInfo
 * @param buildProgressBars
 * @param phaserGame
 * @returns {*}
 */
var updateBarriers = function (barriers, barricadeTimers, map, gameId, playerSprites, playerGroup, mapInfo, buildProgressBars, phaserGame) {
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
        drawBarricade(map, barricade.state, barricade.intersectionId, currentMapInfo);

        var from = _.isUndefined(barricade.progress) ? null : barricade.progress;
        if ((_.isNull(from) || barricade.progress === 0)
            && barricade.time != Infinity
            && !_.isUndefined(barricade.time)
            && !_.isUndefined(barricade.progressTime)) {
            // Compute from with time data
            var serverNow = TimeSync.serverTime(new Date());
            from = inverseLerp(barricade.progressTime, barricade.time, serverNow);
        }
        var to = barricade.time == Infinity ? null : (barricade.nextState === Sanitaire.barricadeStates.BUILT ? 1 : 0);
        updateBuildProgressBar(barricade.intersectionId, from, to, barricade.time, buildProgressBars, phaserGame, mapInfo);

        if (barricade.state === Sanitaire.barricadeStates.UNDER_CONSTRUCTION ||
            barricade.state === Sanitaire.barricadeStates.UNDER_DECONSTRUCTION) {
            showBuildProgressBar(buildProgressBars, barricade.intersectionId);
        }

        if (barricade.state === Sanitaire.barricadeStates.UNDER_DECONSTRUCTION &&
            barricade.time > -Infinity && barricade.time < Infinity) {
            //TODO: look into why this happens twice :( (barricade time is off each time by a few millis)
            console.log("demolition started @", barricade.intersectionId);
            //console.log("barricade time: ", barricade.time);
            recalculatePatientZero();
        }

        // Set new timer
        if (barricade.time > -Infinity
            && barricade.time < Infinity) {
            var transitionToNextState = function () {
                drawBarricade(map, barricade.nextState, barricade.intersectionId, currentMapInfo);


                // get the game
                var game = Games.findOne(gameId);

                // get latest log entry from local user
                var myLastBarriersLogEntry = _.find(_.sortBy(game.barriersLog, function (logEntry) {
                        return -logEntry.time;
                    }),
                    function (logEntry) {
                        return logEntry.playerId === Router.current().data().playerId;
                    }
                );

                var isLocalPlayerAtBarricade = false;

                if (myLastBarriersLogEntry) {
                    if (myLastBarriersLogEntry.type === Sanitaire.barricadeActions.START_BUILD || myLastBarriersLogEntry.type === Sanitaire.barricadeActions.START_DEMOLISH) {
                        if (myLastBarriersLogEntry.intersectionId == barricade.intersectionId) {  // careful, string compared w/ number
                            isLocalPlayerAtBarricade = true;
                        }
                    }
                }

                // check to see if the barricade just completed building or demolishing
                // if we are at this specific barricade, then move us to the middle of it
                if (barricade.nextState === Sanitaire.barricadeStates.BUILT) {
                    if (isLocalPlayerAtBarricade) {
                        console.log("build completed @", barricade.intersectionId, "by you");
                        // congrats, you finished building your very own barricade
                        var centerTilePosition = SanitaireMaps.getIntersectionTilePositionForId(barricade.intersectionId, currentMapInfo.intersections);
                        Meteor.call('updatePositionAndVelocity', gameId, {
                            x: centerTilePosition.x * 16,
                            y: centerTilePosition.y * 16
                        }, {
                            x: 0,
                            y: 0
                        }, TimeSync.serverTime(new Date()));
                        // hide the display of progress
                        hideBuildProgressBar(buildProgressBars, barricade.intersectionId);
                        recalculatePatientZero();
                        Meteor.call('stopConstruction', gameId, parseInt(barricade.intersectionId));
                    }
                    else {
                        console.log("build completed @", barricade.intersectionId, "by someone else");
                        // someone else finished building a barricade, let's congratulate them...
                        // hide the display of progress
                        hideBuildProgressBar(buildProgressBars, barricade.intersectionId);
                        recalculatePatientZero();
                    }
                }
                else if (barricade.nextState === Sanitaire.barricadeStates.EMPTY) {
                    if (isLocalPlayerAtBarricade) {
                        console.log("demolition completed @", barricade.intersectionId, "by you");
                        // congrats, you finished demolishing someone's hard work... I guess you put in some work too
                        hideBuildProgressBar(buildProgressBars, barricade.intersectionId);
                        Meteor.call('stopDeconstruction', gameId, parseInt(barricade.intersectionId));
                    }
                    else {
                        console.log("demolition completed @", barricade.intersectionId, "by someone else");
                        // hide the display of progress
                        hideBuildProgressBar(buildProgressBars, barricade.intersectionId);
                    }
                }
                else if (barricade.nextState === Sanitaire.barricadeStates.UNDER_CONSTRUCTION ||
                    barricade.nextState === Sanitaire.barricadeStates.UNDER_DECONSTRUCTION) {
                    console.log("I don't believe we ever get here... but if you see this... somehow we did");
                    showBuildProgressBar(buildProgressBars, barricade.intersectionId);
                }
            };
            // Convert to local time
            var time = barricade.time - TimeSync.serverOffset();

            // Freeze the progress
            if (time === Infinity) {
                return;
            }

            // If the transition would have already occurred according to server time,
            // make the next transition the one
            if (time < (new Date()).getTime()) {
                // Transition into the next state now
                transitionToNextState()
            } else {
                // Schedule a transition into the next state
                Deps.afterFlush(function () {
                    barricadeTimers.push(Meteor.setTimeout(function () {
                        transitionToNextState();
                    }, Math.max(0, time - (new Date().getTime()))))
                });
            }
        }
    });

    recalculatePatientZero = function () {
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

        console.log("checking pzero and updating road colors");
        var patientZeroRoadId = SanitaireMaps.getRoadIdForTilePosition(patientZeroCurrentLocation.x, patientZeroCurrentLocation.y, currentMapInfo); // TODO: get actual road id from this game!!!!!!!
        var mapGraph = getGraphRepresentationOfMap(currentMapInfo, game);
        var patientZeroStatus = GraphAnalysis.checkPatientZero(mapGraph, playerRoadIds, patientZeroRoadId, mapInfo.roads.length);
        // color streets according to their state
        var roadStatuses = GraphAnalysis.getRoadStatus(mapGraph, playerRoadIds, patientZeroRoadId, mapInfo.roads.length);
        _.each(roadStatuses, function (roadStatus, roadId) {
            updateRoadTiles(map, roadId, mapInfo, roadStatus);
        });

        // Update visible patient zero status
        if (patientZeroStatus === GraphAnalysis.pzerostatus.ISOLATED) {
            console.log("should end game now, p-zero isolated");

            setTimeout(function () {
                //alert("Congrats, you have isolated Patient Zero!!!");
                Session.set("endGameWinCondition", true);
            }, 3000);
            //Sanitaire._endGame(gameId);
            Session.set("patient zero isolated", true);
            Session.set("patient zero contained", false);
            Session.set("patient zero loose", false);
        }
        else if (patientZeroStatus === GraphAnalysis.pzerostatus.CONTAINED) {
            console.log("Pzero trapped with healthy responders, get them out!!!");
            Session.set("patient zero isolated", false);
            Session.set("patient zero contained", true);
            Session.set("patient zero loose", false);
        }
        else {
            // nobody contained...
            Session.set("patient zero isolated", false);
            Session.set("patient zero contained", false);
            Session.set("patient zero loose", true);
        }
    };

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

        // add a highlight for pzero
        patientZeroSprite.highlight = phaserGame.add.sprite(patientZeroCurrentLocation.x * 16, patientZeroCurrentLocation.y * 16, 'highlight_pzero_rings', 1);
        patientZeroSprite.highlight.animations.add('sick', [0, 1, 2, 3, 4], 5, true);
        patientZeroSprite.highlight.play('sick');
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
 * Update the position of patient zero
 * @param patientZeroSprite {Phaser.Sprite} A Phaser sprite
 * @param tilePosition {{x: Number, y: Number}} A position in tile space where patient zero should be
 */
var updatePatientZeroPosition = function (patientZeroSprite, tilePosition) {
    if (!tilePosition) return;
    patientZeroSprite.position.x = tilePosition.x * 16;
    patientZeroSprite.position.y = tilePosition.y * 16;
    var offset = (patientZeroSprite.highlight.width - patientZeroSprite.width) / 2;
    patientZeroSprite.highlight.position.x = patientZeroSprite.position.x - offset;
    patientZeroSprite.highlight.position.y = patientZeroSprite.position.y - offset;
};

/**
 * returns the direction in degrees from p-zero to a player
 * @param patientZeroSprite {Phaser.Sprite}
 * @param playerSprite {Phaser.Sprite}
 * @returns {number}
 */
var getPatientZeroDirectionInDegrees = function (patientZeroSprite, playerSprite) {
    var deltaY = patientZeroSprite.position.y - playerSprite.position.y;
    var deltaX = patientZeroSprite.position.x - playerSprite.position.x;
    var angle = Math.atan2(-deltaY, deltaX); //angle is in radians; -y because the axis is flipped
    angle = (angle * 180) / (Math.PI); // convert to degree
    return angle;
};

/**
 *
 * @param patientZeroSprite {Phaser.Sprite}
 * @param playerSprite {Phaser.Sprite}
 * @returns {number}
 */
var getPatientZeroDistance = function (patientZeroSprite, playerSprite) {
    var a = patientZeroSprite.position.x - playerSprite.position.x;
    var b = patientZeroSprite.position.y - playerSprite.position.y;
    return Math.sqrt(a * a + b * b);
};

/**
 * Shows the direction and distance between the player and patient zero on screen
 * @param distance {Number}
 * @param angle {Number}
 */
var updateDisplayForPatientZeroTracker = function (distance, angle) {
    Session.set("pzero distance", distance);
    Session.set("pzero angle", angle);
};

/**
 * Building progress bars - show status of build
 * @param intersectionId {Number} which intersection we represent
 * @param x {Number} position to place in the x coord
 * @param y {Number} position to place in the y coord
 * @param game {Phaser.Game} the game to add the bars to
 * @param [startWidth=0] {Number}
 */
var addBuildProgressBar = function (intersectionId, x, y, phaserGame, buildProgressBars, currentValue) {
    // move the text to the top right of the square
    x += 16;

    var percentComplete = Math.round(currentValue * 100);
    var text = phaserGame.add.text(x, y, percentComplete, {
        font: "Bold 36px Arial",
        fill: '#FFFFFF',
        backgroundColor: '#1E1E22'
    })
    text.anchor.x = 0.0;
    text.anchor.y = 1.0;
    text.textValue = percentComplete;

    buildProgressBars[intersectionId] = {
        x: x,
        y: y,
        intersectionId: intersectionId,
        text: text,
        tween: null
    };
};

/**
 * Show build progress
 * @param buildProgressBars {*} Array of Phaser.Sprites
 * @param intersectionId {Number} id of an intersection to show progress at
 */
var showBuildProgressBar = function (buildProgressBars, intersectionId) {
    // make build progress visible
    buildProgressBars[intersectionId].text.visible = true;
};

/**
 * Hide build progress
 * @param buildProgressBars {*} Array of Phaser.Sprites
 * @param intersectionId {Number} id of an intersection to hide progress at
 */
var hideBuildProgressBar = function (buildProgressBars, intersectionId) {
    // make build progress invisible
    buildProgressBars[intersectionId].text.visible = false;
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

    // Stop the tween if it already exists
    if (!!buildProgressBars[intersectionId].tween) {
        buildProgressBars[intersectionId].tween.stop();
        phaserGame.tweens.remove(buildProgressBars[intersectionId].tween);
    }


    if (!_.isNull(from)) {
        var tv = buildProgressBars[intersectionId].text.textValue;
        if (from == 0
            && parseInt(tv) != parseInt(from.toString())) {
            //debugger;
            console.log(tv);
        }
        buildProgressBars[intersectionId].text.textValue = Math.floor(from * 100).toString();
    }

    if (!_.isNull(to)) {
        // to(properties, duration, ease, autoStart, delay, repeat, yoyo)
        var diff = time - TimeSync.serverTime(new Date());
        var properties = {textValue: 100 * to};
        var duration = Math.max(0.1, diff);
        var ease = Phaser.Easing.Linear.None;
        var autoStart = true;
        buildProgressBars[intersectionId].tween = phaserGame.add.tween(buildProgressBars[intersectionId].text).to(
            properties,
            duration,
            ease,
            autoStart
        );
        buildProgressBars[intersectionId].tween.onUpdateCallback(updateBuildProgressText);

        function updateBuildProgressText(tween) {
            var roundValue = Math.floor(tween.target.textValue);
            tween.target.setText(roundValue.toString());
        }
    }
};

/**
 * If patient zero is close enough, updates the PlayerState to show that the local player is stunned
 * @param localPlayerState {Object}
 * @param distance {Number}
 */
var isTouchedByPatientZero = function (localPlayerState, distance, localPlayerId) {
    if (distance <= 5 && !localPlayerState.health.isStunned) {
        //TODO: distance is arbitrary right now

        // Stop building if building
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

        console.log("touched!");
        localPlayerState.health.isStunned = true;
        localPlayerState.health.timeWhenTouchedByPatientZero = TimeSync.serverTime(new Date());
        Session.set("isPlayerStunned", true);

        return true;
    }
    return false;
};

/**
 * Stops the player, updates the server about the stop, and stops sprite animation
 * @param gameId {String} id of current game
 * @param playerSprite {Phaser.Sprite}
 */
var stunPlayer = function (gameId, playerSprite) {
    // Let the server know our player is stunned
    stopLocalPlayer(gameId, playerSprite);
};

/**
 * Updates player state to show that they are no longer stunned, and re-animates player
 * @param playerSprite {Phaser.Sprite}
 * @param localPlayerState {Object}
 */
var unstunPlayer = function (playerSprite, localPlayerState) {
    localPlayerState.health.isStunned = false;
    localPlayerState.health.timeWhenTouchedByPatientZero = -Infinity;
};

Template.worldBoard.onRendered(function () {
    Session.set("patient zero loose", true);
    Session.set("endGameWinCondition", false);
    Session.set("isPlayerStunned", false);
        var renderer = this;
        var routeData = Router.current().data();
        var gameId = routeData.gameId;
        var localPlayerId = routeData.playerId;
        var game = Games.findOne(gameId);
        var localPlayerSprite = Players.findOne(localPlayerId);
        var localPlayerState = {
            construction: {
                isBuilding: false,
                intersectionId: -1
            },
            health: {
                value: 1.0,
                isStunned: false,
                timeWhenTouchedByPatientZero: -Infinity
            },

        };

        // scale everything a bit to up performance when moving the map
        //var scaleValue = 1.75;
        var width = 640;//window.innerWidth / scaleValue;
        var height = 800;//window.innerHeight / scaleValue;

        var playerSprites = {};   // this is our players list
        var playerGroup;    // Phaser.Group
        var barricades = [];
        // keep an array of build progress bars for each intersection
        var buildProgressBars = {};
        // This is a list of timers that are used to schedule when the barricade state transition occurs
        var barricadeTimers = [];
        var patientZeroSprite = null;

        // KEYS FOR TESTING FEATURES
        var key1, key2, key3, key4;

        var initializeMeteor = function () {
            renderer.autorun(function () {
                if (this.initialized) {
                    return;
                }

                var updateGame = function (id, fields) {
                    _.each(fields, function (v, k) {
                        // See if a quarantine tile has been added
                        if (k === 'barriers') {
                            updateBarriers(v, barricadeTimers, map, gameId, playerSprites, playerGroup, currentMapInfo, buildProgressBars, phaserGame);
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

        var phaserGame = new Phaser.Game(width, height, Phaser.CANVAS, 'gameboard', {
            preload: preload,
            create: create,
            update: update,
            render: render
        });

        function preload() {
            // load path to map from settings
            var filename = Sanitaire.DEFAULT_MAP;
            var mapPath = "/assets/tilemaps/csv/" + filename;
            phaserGame.load.tilemap('map', mapPath, null, Phaser.Tilemap.CSV);
            phaserGame.load.image('tiles', '/assets/tilemaps/tiles/MembersWeekFull.png');
            phaserGame.load.image('barricade_horiz', '/assets/sprites/barricade_horiz.png');
            phaserGame.load.spritesheet('player', '/assets/sprites/cdc_man.png', 16, 16);
            phaserGame.load.spritesheet('highlight_local_player', '/assets/sprites/highlight_local_rings_64x64x8.png', 64, 64);
            phaserGame.load.spritesheet('patientZero', '/assets/sprites/patient_zero_0.png', 16, 16);
            phaserGame.load.spritesheet('highlight_pzero_rings', '/assets/sprites/highlight_pzero_rings_64x64x5.png', 64, 64);
            phaserGame.load.spritesheet('button', '/assets/buttons/button_sprite_sheet.png', 193, 71);
            phaserGame.stage.disableVisibilityChange = true;
        }

        var map;
        var layer;
        var cursors;
        var localPlayerSprite;
        var localPlayerHighlight;
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

            // nearest neighbor pixel rendering
            //Phaser.Canvas.setImageRenderingCrisp(canvas);
            Phaser.Canvas.setSmoothingEnabled(phaserGame.context, false);
        }

        function create() {

            // let's scale to fullscreen
            goFullScreen();

            //  Because we're loading CSV map data we have to specify the tile size here or we can't render it
            map = phaserGame.add.tilemap('map', 16, 16);

            //  Now add in the tileset
            map.addTilesetImage('tiles');

            //  Create our layer
            // Size it to the map if need be for the camera
            layer = map.createLayer(0, map.width * map.tileWidth, map.height * map.tileHeight);

            //  Resize the world
            layer.resizeWorld();

            // Scale the screen to fit

            if (Sanitaire.DEFAULT_ZOOM === "SHOW_FULL_MAP") {
                Session.set("is game zoomed out", true);
                var ratioX = phaserGame.camera.view.width / phaserGame.world.bounds.width;
                var ratioY = phaserGame.world.camera.view.height / phaserGame.world.bounds.height;
                var ratio = Math.min(ratioX, ratioY);
                console.log("ratios: ", ratioX, ratioY, ratio);
                phaserGame.world.scale.x = ratio;
                phaserGame.world.scale.y = ratio;
            }
            else {
                Session.set("is game zoomed out", false);
                phaserGame.world.scale.x = Sanitaire.DEFAULT_ZOOM;
                phaserGame.world.scale.y = Sanitaire.DEFAULT_ZOOM;
            }

            // Create a group to add player sprites to
            playerGroup = phaserGame.add.group();

            //  Simplified list of things that the player collides into
            //map.setCollisionBetween(0, 7, true, layer, true);  // walls + buildings
            //map.setCollisionBetween(13, 14, true, layer, true); // barricades
            map.setCollisionByExclusion(SanitaireMaps.PATHABLE_TILES, true, layer, true);

            //  Handle special tiles on gameboard (i.e. intersections)
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

            // test new feature with key press
            //key1 = phaserGame.input.keyboard.addKey(Phaser.Keyboard.ONE);
            //key1.onDown.add(colorRandomRoadGrey, this);
            //
            //key2 = phaserGame.input.keyboard.addKey(Phaser.Keyboard.TWO);
            //key2.onDown.add(colorRandomRoadYellow, this);
            //
            //key3 = phaserGame.input.keyboard.addKey(Phaser.Keyboard.THREE);
            //key3.onDown.add(colorRandomRoadRed, this);
            //
            //key4 = phaserGame.input.keyboard.addKey(Phaser.Keyboard.FOUR);
            //key4.onDown.add(colorRandomRoadGreen, this);

            currentMapInfo = SanitaireMaps.getMapInfo(map);

            // create a node/edge representation of intersections and roads
            // This is sort of already done by adding intersections to the roads array
            // each road is an edge, containing the two nodes it connects

            //var game = Games.findOne(gameId, {reactive: false});
            //var mapGraph = getGraphRepresentationOfMap(currentMapInfo, game);

            initializeMeteor();
        }

        /**
         *  return a graph of the map in the following form
         *  var exampleGraph = { 'intersection id 1': ['interesction id 2', 'intersection id 4', 'intersection id 10'],
         *  notice that id 1 is connected to 4 and 4 is connected to 1
         *  'intersection id 4': ['intersection id 1', 'intersection id 8'],
         */
        getGraphRepresentationOfMap = function (currentMapInfo, game) {
            var graph = {};

            // find which intersections are blocked
            // including those that have completed based on time, but not yet completed in the game document
            var completedBarriers = _.filter(game.barriers, function (barrier) {
                return (barrier.state == Sanitaire.barricadeStates.BUILT || (barrier.nextState == Sanitaire.barricadeStates.BUILT && barrier.time < (new Date()).getTime()));
            });

            // create an array of the intersection Ids
            var blockedIntersectionIds = [];
            _.each(completedBarriers, function (barrier) {
                blockedIntersectionIds.push(barrier.intersectionId);
            });

            currentMapInfo.roads.forEach(function (roadV) {
                if (!graph[roadV.id]) {
                    graph[roadV.id] = [];
                }

                roadV.intersectionIds.forEach(function (intersectionId) {
                    if (_.any(blockedIntersectionIds, function (blockedId) {
                            return blockedId == intersectionId;
                        })) {
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

                var isPlayerInjured = false;

                // check to see if the next block in the direction being walked is a legal move
                // *** THIS STOPS PLAYERS FROM WALKING THROUGH BARRICADES!!! *** (among other things)
                // check if user has run to the end of the canvas and stop them if so
                if (playerId === localPlayerId) {
                    if (!isLegalWalkingPosition(sprite.body)
                        || sprite.body.position.x < 0
                        || sprite.body.position.y < 0
                        || sprite.body.position.x > map.widthInPixels - map.tileWidth
                        || sprite.body.position.y > map.heightInPixels - map.tileHeight) {
                        Meteor.call('updatePositionAndVelocity', gameId, {
                            x: sprite.position.x,
                            y: sprite.position.y
                        }, {
                            x: 0,
                            y: 0
                        }, TimeSync.serverTime(new Date()));
                    }

                    // look at the position of patient zero rel to local player
                    var distance = getPatientZeroDistance(patientZeroSprite, sprite);

                    // Check if touched by patient zero
                    var justTouched = isTouchedByPatientZero(localPlayerState, distance, localPlayerId);
                    if (justTouched) {
                        console.log("sprite when touched", sprite);
                    }

                    var currentTime = TimeSync.serverTime(new Date());
                    if (localPlayerState.health.isStunned) {
                        if ((currentTime - localPlayerState.health.timeWhenTouchedByPatientZero) < Sanitaire.STUN_DURATION_SECONDS * 1000) {
                            if (justTouched) {
                                stunPlayer(gameId, sprite);
                                localPlayerHighlight.tint = 0xFF0000;
                            }
                            isPlayerInjured = true;
                        } else {
                            unstunPlayer(sprite, localPlayerState);
                            isPlayerInjured = false;
                            localPlayerHighlight.tint = 0xFFFFFF;
                        }
                    }

                    // keep our highlight moving with us
                    var offset = (localPlayerHighlight.width - sprite.width) / 2;
                    localPlayerHighlight.position.x = sprite.position.x - offset;
                    localPlayerHighlight.position.y = sprite.position.y - offset;
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
                    if (isPlayerInjured) {
                        sprite.play('injured');
                    }
                    else {
                        sprite.play('idle');
                    }
                }
            }

        }

        function render() {

            // game.debug.body(player);

        }

        /**
         * Returns true only if the player can continue moving in the current direction
         * otherwise returns false, which should be handled to stop sprites in their tracks
         * @param body {Phaser.Body} contains position and velocity of the sprite
         */
        function isLegalWalkingPosition(body) {
            var nextTile;
            var currentTile;

            // check tile in the direction we are headed
            if (body.velocity.x > 0) {  // right
                currentTile = {x: Math.floor((body.position.x) / 16), y: Math.floor((body.position.y + 8) / 16)};
                nextTile = map.getTile(currentTile.x + 1, currentTile.y, 0);
            } else if (body.velocity.x < 0) {  // left
                currentTile = {x: Math.floor((body.position.x + 8) / 16), y: Math.floor((body.position.y + 8) / 16)};
                nextTile = map.getTile(currentTile.x - 1, currentTile.y, 0);
            } else if (body.velocity.y > 0) {  // down
                currentTile = {x: Math.floor((body.position.x + 8) / 16), y: Math.floor((body.position.y) / 16)};
                nextTile = map.getTile(currentTile.x, currentTile.y + 1, 0);
            } else if (body.velocity.y < 0) {  // up
                currentTile = {x: Math.floor((body.position.x + 8) / 16), y: Math.floor((body.position.y + 16) / 16)};
                nextTile = map.getTile(currentTile.x, currentTile.y - 1, 0);
            } else {
                // not walking anywhere, feel free to loiter all you want
                return true;
            }

            if (!nextTile) {
                return false;
            }

            return _.indexOf(SanitaireMaps.PATHABLE_TILES, nextTile.index) !== -1;
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

            // don't move when player is stunned
            if (localPlayerState.health.isStunned) {
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
            var shouldShowBothButtons = false;

            // if the barricade record exists
            if (!!barricade) {
                if (barricade.state === Sanitaire.barricadeStates.BUILT) {
                    //console.log("X: no need to prompt, this should handled from a crosswalk");
                    return;
                }
                else if (barricade.state === Sanitaire.barricadeStates.UNDER_CONSTRUCTION
                    || barricade.state === Sanitaire.barricadeStates.UNDER_DECONSTRUCTION
                    || barricade.state === Sanitaire.barricadeStates.EMPTY
                    || barricade.state === Sanitaire.barricadeStates.NONE) {
                    //console.log("X: we should have the option to build at intersection ", intersectionId);

                    if (TimeSync.serverTime(new Date()) < barricade.time
                        || barricade.time == Infinity) {
                        shouldShowBuildButton = barricade.buttons === Sanitaire.barricadeButtons.BUILD;
                        shouldShowDestroyButton = barricade.buttons === Sanitaire.barricadeButtons.DESTROY;
                        shouldShowBothButtons = barricade.buttons === Sanitaire.barricadeButtons.BUILD_AND_DESTROY;
                    } else {
                        shouldShowBuildButton = barricade.nextButtons === Sanitaire.barricadeButtons.BUILD;
                        shouldShowDestroyButton = barricade.nextButtons === Sanitaire.barricadeButtons.DESTROY;
                        shouldShowBothButtons = barricade.nextButtons === Sanitaire.barricadeButtons.BUILD_AND_DESTROY;
                    }
                }
                else {
                    console.log("X: how did we get here?");
                    return;
                }
            } else {
                //console.log("X: we should have the option to build at intersection ", intersectionId, ". It has never been built on.");

                shouldShowBuildButton = true;
                shouldShowDestroyButton = false;
            }

            // reset our catch for same intersection
            movesSincePrompt = 0;
            lastIntersectionId = intersectionId;

            showButtons(shouldShowBuildButton, shouldShowDestroyButton, shouldShowBothButtons);

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
            if (Math.abs((Math.floor(sprite.position.x) - 7) % 16) > 1 && Math.abs((Math.floor(sprite.position.y) - 7) % 16) > 1) {
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
            var shouldShowBothButtons = false;

            // if the barricade is built then offer demolish
            if (!!barricade) {
                if (barricade.state === Sanitaire.barricadeStates.BUILT) {
                    //console.log("CW: prompting from crosswalk at intersection ", intersectionId, " with barricade: ", barricade);

                    if (TimeSync.serverTime(new Date()) < barricade.time
                        || barricade.time == Infinity) {
                        shouldShowBuildButton = barricade.buttons === Sanitaire.barricadeButtons.BUILD;
                        shouldShowDestroyButton = barricade.buttons === Sanitaire.barricadeButtons.DESTROY;
                        shouldShowBothButtons = barricade.buttons === Sanitaire.barricadeButtons.BUILD_AND_DESTROY;
                    } else {
                        shouldShowBuildButton = barricade.nextButtons === Sanitaire.barricadeButtons.BUILD;
                        shouldShowDestroyButton = barricade.nextButtons === Sanitaire.barricadeButtons.DESTROY;
                        shouldShowBothButtons = barricade.nextButtons === Sanitaire.barricadeButtons.BUILD_AND_DESTROY;
                    }

                    // reset our catch for same intersection
                    movesSincePrompt = 0;
                    lastIntersectionId = intersectionId;
                }
                else if (barricade.state === Sanitaire.barricadeStates.UNDER_CONSTRUCTION
                    || barricade.state === Sanitaire.barricadeStates.UNDER_DECONSTRUCTION
                    || barricade.state === Sanitaire.barricadeStates.EMPTY
                    || barricade.state === Sanitaire.barricadeStates.NONE) {
                    //console.log("CW: no need to prompt. Intersection ", intersectionId, " is empty.");
                    return;
                }
                else {
                    console.log("CW: how did we get here?");
                    return;
                }
            }
            else {
                //console.log("CW: no need to prompt. Intersection ", intersectionId, " has never been built on.");
                return;
            }

            showButtons(shouldShowBuildButton, shouldShowDestroyButton, shouldShowBothButtons);

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
            // don't respond if button isn't activated
            if (!buildButtonAvailable) return;

            // hide buttons
            hideButtons();

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
            // don't respond if button isn't activated
            if (!demolishButtonAvailable) return;

            // hide buttons
            hideButtons();

            if (_.isUndefined(lastPromptTile)) {
                return;
            }

            // tell game we are starting to demolish a quarantine
            var intersectionId = SanitaireMaps.getIntersectionIdForTilePosition(lastPromptTile.x, lastPromptTile.y, currentMapInfo);
            Meteor.call('startDeconstruction', gameId, intersectionId, new Date());

            // update state of player
            localPlayerState.construction.isBuilding = true;
            localPlayerState.construction.intersectionId = intersectionId;

            // move player to center of intersection
            var centerTilePosition = SanitaireMaps.getIntersectionTilePositionForId(intersectionId, currentMapInfo.intersections);
            Meteor.call('updatePositionAndVelocity', gameId, {
                x: centerTilePosition.x * 16,
                y: centerTilePosition.y * 16
            }, {
                x: 0,
                y: 0
            }, TimeSync.serverTime(new Date()));
        };

        showButtons = function (isBuild, isDemolish, isBoth) {
            var buildButton = document.getElementById("buildButton");
            var demoButton = document.getElementById("destroyButton");
            var swipeText = document.getElementById("swipeText");

            // make sure our buttons are in the dom
            if(!(buildButton && demoButton)) return;

            if (isBoth) {
                buildButton.style.color = 'rgba(0, 0, 0, 1)';
                buildButton.style.borderColor = 'rgba(0, 0, 0, 1)';
                buildButton.style.background = 'rgba(253, 238, 74, 0.9)';
                demoButton.style.color = 'rgba(0, 0, 0, 1)';
                demoButton.style.borderColor = 'rgba(0, 0, 0, 1)';
                demoButton.style.background = 'rgba(253, 238, 74, 0.9)';
                buildButtonAvailable = true;
                demolishButtonAvailable = true;
            } else if (isBuild) {
                buildButton.style.color = 'rgba(0, 0, 0, 1)';
                buildButton.style.borderColor = 'rgba(0, 0, 0, 1)';
                buildButton.style.background = 'rgba(253, 238, 74, 0.9)';
                demoButton.style.color = 'rgba(0, 0, 0, 0.2)';
                demoButton.style.borderColor = 'rgba(0, 0, 0, 0.2)';
                demoButton.style.background = 'rgba(164, 182, 200, 0.2)';
                buildButtonAvailable = true;
                demolishButtonAvailable = false;
            } else if (isDemolish) {
                buildButton.style.color = 'rgba(0, 0, 0, 0.2)';
                buildButton.style.borderColor = 'rgba(0, 0, 0, 0.2)';
                buildButton.style.background = 'rgba(164, 182, 200, 0.2)';
                demoButton.style.color = 'rgba(0, 0, 0, 1)';
                demoButton.style.borderColor = 'rgba(0, 0, 0, 1)';
                demoButton.style.background = 'rgba(253, 238, 74, 0.9)';
                buildButtonAvailable = false;
                demolishButtonAvailable = true;
            }
            if(swipeText) swipeText.style.visibility = 'visible';
        };

        /**
         * Hide buttons for build or demolish from screen
         */
        hideButtons = function () {
            buildButtonAvailable = false;
            demolishButtonAvailable = false;

            var buildButton = document.getElementById("buildButton");
            var demoButton = document.getElementById("destroyButton");
            var swipeText = document.getElementById("swipeText");
            if(swipeText) swipeText.style.visibility = 'hidden';

            // make sure our buttons are in the dom
            if(!(buildButton && demoButton)) return;

            buildButton.style.color = 'rgba(0, 0, 0, 0.2)';
            buildButton.style.borderColor = 'rgba(0, 0, 0, 0.2)';
            buildButton.style.background = 'rgba(164, 182, 200, 0.2)';
            demoButton.style.color = 'rgba(0, 0, 0, 0.2)';
            demoButton.style.borderColor = 'rgba(0, 0, 0, 0.2)';
            demoButton.style.background = 'rgba(164, 182, 200, 0.2)';
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
            hideButtons();

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
            player.animations.add('injured', [22, 23, 24, 25], 5, true);
            player.smoothed = false;
            if (Sanitaire.PLAYER_UNIQUENESS) {
                player.tint = determineColorFromPlayerId(playerId);
            } else {
                player.tint = '0xFFEE33';  // otherwise everyone is yellow
            }

            phaserGame.physics.enable(player, Phaser.Physics.ARCADE);

            player.body.setSize(10, 14, 2, 1);

            //
            if (options.isLocalPlayer) {
                // add a highlight for the local player
                localPlayerHighlight = phaserGame.add.sprite(options.location.x, options.location.y, 'highlight_local_player', 1);
                localPlayerHighlight.animations.add('beacon', [0, 1, 2, 3, 4, 5, 6, 7], 5, true);
                localPlayerHighlight.play('beacon');

                if (Sanitaire.DEFAULT_ZOOM != "SHOW_FULL_MAP") {
                    // follow the player if our camera isn't showing the full map
                    phaserGame.camera.follow(player);
                }
            }

            player.playerId = playerId;

            return player;
        };

        /**
         * Gets a color for the suit based on the playerId generated
         * @param playerId
         * @returns {String} hex value for color of suit
         */
        var determineColorFromPlayerId = function (playerId) {
            var color;

            function getNumberValueForChar(string) {
                var charCode = string.charCodeAt(0);
                var value;
                if (charCode >= 97 && charCode <= 122) {
                    // lowercase a-z
                    value = charCode - 97 + 10;
                } else if (charCode >= 65 && charCode <= 90) {
                    // uppercase A-Z
                    value = charCode - 65 + 10 + 26;
                } else if (charCode >= 48 && charCode <= 57) {
                    // numbers 0-9
                    value = charCode - 48;
                }
                // normalize the value
                // 10 Numbers, 26 lowercase, 26 uppercase
                value = value / 62;
                return value;
            }

            // use the first number/letter for HUE
            var hue = getNumberValueForChar(playerId[0]);
            // second letter for Saturation (clamp [0.5, 1.0])
            var sat = 0.5 + getNumberValueForChar(playerId[1]) / 2;
            // third letter for Value (clamp [0.5, 1.0])
            var val = 0.5 + getNumberValueForChar(playerId[2]) / 2;

            color = convertHSVtoHex(hue, sat, val);

            return color;
        };

        /**
         * Useful for making bright, generative colors
         * based on formula here: http://www.rapidtables.com/convert/color/hsv-to-rgb.htm
         * @param h {Number} (0-1)
         * @param s {Number} (0-1)
         * @param v {Number} (0-1)
         * @returns {String} hex value of hsv color
         */
        var convertHSVtoHex = function (h, s, v) {

            function componentToHex(c) {
                var hex = c.toString(16);
                return hex.length == 1 ? "0" + hex : hex;
            }

            function rgbToHex(r, g, b) {
                return "0x" + componentToHex(r) + componentToHex(g) + componentToHex(b);
            }

            h = h * 360;
            var c = v * s;
            var x = c * (1 - Math.abs(Math.floor(h / 60) % 2 - 1));
            var m = v - c;
            var R, G, B;
            switch (Math.floor(h / 60)) {
                case 0:
                    R = c;
                    G = x;
                    B = 0;
                    break;
                case 1:
                    R = x;
                    G = c;
                    B = 0;
                    break;
                case 2:
                    R = 0;
                    G = c;
                    B = x;
                    break;
                case 3:
                    R = 0;
                    G = x;
                    B = c;
                    break;
                case 4:
                    R = x;
                    G = 0;
                    B = c;
                    break;
                case 5:
                    R = c;
                    G = 0;
                    B = x;
                    break;
                default:
                    break;
            }
            R = Math.floor((R + m) * 255);
            G = Math.floor((G + m) * 255);
            B = Math.floor((B + m) * 255);

            return rgbToHex(R, G, B);
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
    }
});