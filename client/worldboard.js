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

        var width = window.innerWidth; // (window.devicePixelRatio * 2);  // everything double scale
        var height = window.innerHeight; // (window.devicePixelRatio * 2);

        var sprites = {};

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
                    // See if a quarantine tile has been added
                    _.each(fields, function (position, k) {
                        if (/^quarantine/.test(k)
                            && !_.isUndefined(position)) {
                            addWallTile(position.x, position.y);
                        }
                    });
                };

                this.playerUpdate = Players.find({gameId: Router.current().data().gameId}).observe({
                    added: function (player) {
                        sprites[player._id] = createSpriteForPlayer(localPlayerId, {isLocalPlayer: player._id == localPlayerId});
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
            var filename = "London.csv";
            var mapPath = "/assets/tilemaps/csv/" + filename;
            phaserGame.load.tilemap('map', mapPath, null, Phaser.Tilemap.CSV);
            phaserGame.load.image('tiles', '/assets/tilemaps/tiles/Basic_CS_Map.png');
            phaserGame.load.spritesheet('player', '/assets/sprites/cdc_man.png', 16, 16);
            phaserGame.load.spritesheet('button', '/assets/buttons/button_sprite_sheet.png', 193, 71);
        }

        var map;
        var layer;
        var cursors;
        var localPlayerSprite;
        var player_direction;
        var button;

        var lastPromptTile = {index: 0, x: 0, y: 0};


// function to scale up the game to full screen
        function goFullScreen() {
            phaserGame.scale.pageAlignHorizontally = true;
            phaserGame.scale.pageAlignVertically = true;
            phaserGame.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
            phaserGame.stage.smoothed = false;
            // game.scale.setScreenSize(true);
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
            map.setCollisionBetween(0, 7);  // walls + buildings
            map.setCollisionBetween(13, 14); // barricades

            //  Handle special tiles on gameboard (i.e. intersections)
            map.setTileIndexCallback(8, promptAtIntersection, this);
            map.setTileIndexCallback(9, promptAtIntersection, this);
            map.setTileIndexCallback(10, promptAtIntersection, this);
            map.setTileIndexCallback(11, promptAtIntersection, this);

            //  Un-comment this on to see the collision tiles
            // layer.debug = true;

            cursors = phaserGame.input.keyboard.createCursorKeys();

            // Useful for adding an HUD
            // var help = game.add.text(16, 16, 'Arrows to move', { font: '14px Arial', fill: '#ffffff' });
            // help.fixedToCamera = true;

            // beginSwipe function
            phaserGame.input.onDown.add(beginSwipe, this);

            //// add button for building quarantines
            //button = phaserGame.add.button(width / 2 - 90, height - 80, 'button', addQuarantine, this, 2, 1, 0);
            //button.fixedToCamera = true;

            //console.log(phaserGame.world.height);

            // create a dictionary of all map tiles
            var maptiles = new Array();

            for (var i = 0; i < map.width; i++) {
                for (var j = 0; j < map.height; j++) {
                    var key = "(" + i + "," + j + ")";
                    maptiles[key] = {
                        index: map.getTile(i, j, 0).index,
                        intersection: null
                    };
                }
            }

            // create a dictionary of all intersections on the map
            var intersection_index = 0;
            // look through all tiles
            for (var i = 0; i < map.width; i++) {
                for (var j = 0; j < map.height; j++) {
                    var key = "(" + i + "," + j + ")";
                    if (maptiles[key].index === 15) // is intersection
                    {
                        // if N, S, E, W, neighbor is in an intersection, add this one to that collection
                        var n_key = "(" + i + "," + (j - 1) + ")";
                        var s_key = "(" + i + "," + (j + 1) + ")";
                        var e_key = "(" + (i + 1) + "," + j + ")"
                        var w_key = "(" + (i - 1) + "," + j + ")"

                        if (maptiles[n_key]) {
                            if(maptiles[n_key].index === 15 && maptiles[n_key].intersection != null)
                                maptiles[key].intersection = maptiles[n_key].intersection;
                        }
                        else if (maptiles[s_key]) {
                            if(maptiles[s_key].index === 15 && maptiles[s_key].intersection != null)
                                maptiles[key].intersection = maptiles[s_key].intersection;
                        }
                        else if (maptiles[e_key]) {
                            if(maptiles[e_key].index === 15 && maptiles[e_key].intersection != null)
                                maptiles[key].intersection = maptiles[e_key].intersection;
                        }
                        else if (maptiles[w_key]) {
                            if(maptiles[w_key].index === 15 && maptiles[w_key].intersection != null)
                                maptiles[key].intersection = maptiles[w_key].intersection;
                        }
                        else {
                            // if no neighboring intersection tile, create a new intersection
                            maptiles[key].intersection = intersection_index;
                            intersection_index++;
                        }
                    }
                }
            }

            // Use filter to find and quickly group intersections...
            // console log tiles in each intersection
            //for (var i = 0; i < intersection_index; i++) {
            //    var tiles = maptiles.filter(function (t) {
            //        return t.intersection === i;
            //    });
            //    console.log("intersection: " + i);
            //    console.log(tiles);
            //}

            initializeMeteor();
        }

        var lastLocalPlayerWallCollisionHandled = null;

        function update() {
            for (var playerId in sprites) {
                var sprite = sprites[playerId];

                // Do physics
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
                    sprite.animations.stop();
                }
            }

            //return;
            //
            //
            //localPlayerSprite.body.velocity.set(0);
            //
            //if (player_direction == 'left' || cursors.left.isDown) {
            //    move('left');
            //}
            //else if (player_direction == 'right' || cursors.right.isDown) {
            //    move('right');
            //}
            //else if (player_direction == 'up' || cursors.up.isDown) {
            //    move('up');
            //}
            //else if (player_direction == 'down' || cursors.down.isDown) {
            //    move('down');
            //}
            //else {
            //    localPlayerSprite.animations.stop();
            //}

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

            var velocity = {x: 0, y: 0};

            var speed = 150;    // TODO: attach this to a player wrt health

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
        function promptAtIntersection(sprite, tile) {

            /** TODO: move this logic for checks elsewhere, the function
             * should simply display the correct prompt (i.e. buttons when needed)
             *
             */

            if ((tile.x == lastPromptTile.x || tile.x == (lastPromptTile.x - 1) || tile.x == (lastPromptTile.x + 1))
                && (tile.y == lastPromptTile.y || tile.y == (lastPromptTile.y - 1) || tile.y == (lastPromptTile.y + 1)))
                return;

            lastPromptTile.index = tile.index;
            lastPromptTile.x = tile.x;
            lastPromptTile.y = tile.y;

            // give option to build
            console.log("At intersection");
            console.log(tile);

            // testing to see which intersection we are at
            // TODO: only stop once at a single intersection, i.e. not all sides
            // TODO: build quarantine around entire intersection
            // getIntersectionTiles(tile);

            // stop our player (stops animation and movement)
            player_direction = '';
        }

// place build a quarantine on the corner that a player arrives at
        addQuarantine = function () {

            if (_.isUndefined(lastPromptTile)) {
                return;
            }

            // TODO: Call meteor method instead
            Meteor.call('addQuarantine', gameId, {x: lastPromptTile.x, y: lastPromptTile.y});

            return;
            //horizontal
            if (lastPromptTile.index == 8 || lastPromptTile.index == 9) {
                map.fill(13, lastPromptTile.x, lastPromptTile.y, 1, 1);
            }

            // vertical
            if (lastPromptTile.index == 10 || lastPromptTile.index == 11) {
                map.fill(14, lastPromptTile.x, lastPromptTile.y, 1, 1);
            }
        };

        function addWallTile(positionX, positionY) {
            map.fill(13, positionX, positionY, 1, 1);
        };

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
                isLocalPlayer: false
            }, options);

            var player = phaserGame.add.sprite(16, 16, 'player', 1);
            player.animations.add('left', [8, 9], 10, true);
            player.animations.add('right', [1, 2], 10, true);
            player.animations.add('up', [11, 12, 13], 10, true);
            player.animations.add('down', [4, 5, 6], 10, true);
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
    'click #mainToggleButton': function () {
        // TODO: Make this smarter (it should be calling a meteor method)
        addQuarantine();
    }
});