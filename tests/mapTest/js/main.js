var width = window.innerWidth / (window.devicePixelRatio * 2);  // everything double scale
var height = window.innerHeight / (window.devicePixelRatio * 2);
var scaleRatio = window.devicePixelRatio / 3;   // assuming the most dense is 3x


var game = new Phaser.Game(width, height, Phaser.AUTO, 'gameboard', { preload: preload, create: create, update: update, render: render });

// var game = new Phaser.Game(width, height, Phaser.AUTO, 'gameboard', { preload: preload, create: create, update: update, render: render });

function preload() {

    game.load.tilemap('map', 'assets/tilemaps/csv/cordon_gradient.csv', null, Phaser.Tilemap.CSV);
    game.load.image('tiles', 'assets/tilemaps/tiles/Basic_CS_Map.png');
    game.load.spritesheet('player', 'assets/sprites/cdc_man.png', 16, 16);
    game.load.spritesheet('button', 'assets/buttons/button_sprite_sheet.png', 193, 71);
}

var map;
var layer;
var cursors;
var player;
var player_direction;
var button;

var lastPromptTile = {index:0, x:0, y:0};


// function to scale up the game to full screen
function goFullScreen(){
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.stage.smoothed=false
    // game.scale.setScreenSize(true);
}

function create() {

    // let's scale to fullscreen
    goFullScreen();

    //  Because we're loading CSV map data we have to specify the tile size here or we can't render it
    map = game.add.tilemap('map', 16, 16);

    //  Now add in the tileset
    map.addTilesetImage('tiles');
    
    //  Create our layer
    layer = map.createLayer(0);

    //  Resize the world
    layer.resizeWorld();

    //  This isn't totally accurate, but it'll do for now
    map.setCollisionBetween(0, 7);

    //  Handle special tiles on gameboard (i.e. intersections)
    map.setTileIndexCallback(8, promptAtIntersection, this);
    map.setTileIndexCallback(9, promptAtIntersection, this);
    map.setTileIndexCallback(10, promptAtIntersection, this);
    map.setTileIndexCallback(11, promptAtIntersection, this);

    //  Un-comment this on to see the collision tiles
    // layer.debug = true;

    //  Player
    player = game.add.sprite(16, 16, 'player', 1);
    player.animations.add('left', [8,9], 10, true);
    player.animations.add('right', [1,2], 10, true);
    player.animations.add('up', [11,12,13], 10, true);
    player.animations.add('down', [4,5,6], 10, true);
    player.smoothed = false;

    game.physics.enable(player, Phaser.Physics.ARCADE);

    player.body.setSize(10, 14, 2, 1);

    game.camera.follow(player);

    cursors = game.input.keyboard.createCursorKeys();

    // Useful for adding an HUD
    // var help = game.add.text(16, 16, 'Arrows to move', { font: '14px Arial', fill: '#ffffff' });
    // help.fixedToCamera = true;

    // beginSwipe function
    game.input.onDown.add(beginSwipe, this);

    // add button for building quarantines
    button = game.add.button(width/2 - 90, height - 80, 'button', addQuarantine, this, 2, 1, 0);
    //button.scale.setTo(scaleRatio, scaleRatio);
    button.fixedToCamera = true; 

    console.log(game.world.height);
}

function update() {

    game.physics.arcade.collide(player, layer);

    player.body.velocity.set(0);

    if (player_direction == 'left'|| cursors.left.isDown)
    {
        move('left');
    }
    else if (player_direction == 'right' || cursors.right.isDown)
    {
        move('right');
    }
    else if (player_direction == 'up' || cursors.up.isDown)
    {
        move('up');
    }
    else if (player_direction == 'down' || cursors.down.isDown)
    {
        move('down');
    }
    else
    {
        player.animations.stop();
    }

}

function render() {

    // game.debug.body(player);

}

function move(direction) {
    switch(direction) {
        case 'left': 
                player.body.velocity.x = -100;
                player.play('left');
            break;
        
        case 'right':
                player.body.velocity.x = 100;
                player.play('right');
            break;
        
        case 'down': 
                player.body.velocity.y = 100;
                player.play('down');
            break;
        
        case 'up': 
                player.body.velocity.y = -100;
                player.play('up');
            break;
        
        default: break;
    }
}

function promptAtIntersection(sprite, tile) {

    if((tile.x == lastPromptTile.x || tile.x == (lastPromptTile.x - 1) || tile.x == (lastPromptTile.x + 1))
     && (tile.y == lastPromptTile.y || tile.y == (lastPromptTile.y - 1) || tile.y == (lastPromptTile.y + 1)))
        return;

    lastPromptTile.index = tile.index;
    lastPromptTile.x = tile.x;
    lastPromptTile.y = tile.y;

    // give option to build
    console.log("At intersection");
    console.log(tile);
    // player.body.velocity.x = 0;
    // player.body.velocity.y = 0;
    //player.animations.stop();
    player_direction = '';
    // tile.alpha = 0.2;
    // layer.dirty = true;
    //return false;
}

// place build a quarantine on the corner that a player arrives at
function addQuarantine(){

    //horizontal
    if(lastPromptTile.index == 8 || lastPromptTile.index == 9) {
        map.fill(13, lastPromptTile.x, lastPromptTile.y, 1, 1);
    }

    // vertical
    if(lastPromptTile.index == 10 || lastPromptTile.index == 11) {
        map.fill(14, lastPromptTile.x, lastPromptTile.y, 1, 1);
    }
}

// get all intersection tiles at intersection
function getIntersectionTiles(currentTile){
    // look through tiles and keep an array of all intersection tiles
    // look up, down, left, right... if intersection tile, add it to array and

}

// get all crosswalk tiles given an intersection
function getCrosswalkTiles(intersectionTiles){
    // look through tiles and keep an array of all crosswalk tiles
    for (tile of intersectionTiles) {
        // look for a crosswalk as neighbor (up, down, left, right)
    }
}

// when the player begins to swipe we only save mouse/finger coordinates, remove the touch/click
// input listener and add a new listener to be fired when the mouse/finger has been released,
// then we call endSwipe function
function beginSwipe(){
    startX = game.input.worldX;
    startY = game.input.worldY;
    game.input.onDown.remove(beginSwipe);
    game.input.onUp.add(endSwipe);
}

// function to be called when the player releases the mouse/finger
function endSwipe(){
    // saving mouse/finger coordinates
    endX = game.input.worldX;
    endY = game.input.worldY;
    // determining x and y distance travelled by mouse/finger from the start
    // of the swipe until the end
    var distX = startX-endX;
    var distY = startY-endY;
    // in order to have an horizontal swipe, we need that x distance is at least twice the y distance
    // and the amount of horizontal distance is at least 10 pixels
    if(Math.abs(distX)>Math.abs(distY)*2 && Math.abs(distX)>10){
        // moving left, calling move function with horizontal and vertical tiles to move as arguments
        if(distX>0){
                player_direction = 'left';
           }
           // moving right, calling move function with horizontal and vertical tiles to move as arguments
           else{
                player_direction = 'right';
           }
    }
    // in order to have a vertical swipe, we need that y distance is at least twice the x distance
    // and the amount of vertical distance is at least 10 pixels
    if(Math.abs(distY)>Math.abs(distX)*2 && Math.abs(distY)>10){
        // moving up, calling move function with horizontal and vertical tiles to move as arguments
        if(distY>0){
                player_direction = 'up';
           }
           // moving down, calling move function with horizontal and vertical tiles to move as arguments
           else{
                player_direction = 'down';
           }
    }   

    // stop listening for the player to release finger/mouse, let's start listening for the player to click/touch
    game.input.onDown.add(beginSwipe);
    game.input.onUp.remove(endSwipe);
}

// listenSwipe(function(direction) {
//     console.log(direction);
// });

// function listenSwipe(callback) {
//     var eventDuration;
//     var startPoint = {};
//     var endPoint = {};
//     var direction;
//     var minimum = {
//         duration: 75,
//         distance: 150
//     }

//     game.input.onDown.add(function(pointer) {
//         startPoint.x = pointer.clientX;
//         startPoint.y = pointer.clientY;
//     }, this);

//     game.input.onUp.add(function(pointer) {
//         direction = '';
//         eventDuration = game.input.activePointer.duration;

//         if (eventDuration > minimum.duration) {
//             endPoint.x = pointer.clientX;
//             endPoint.y = pointer.clientY;

//             // Check direction
//             if (endPoint.x - startPoint.x > minimum.distance) {
//                 direction = 'right';
//             } else if (startPoint.x - endPoint.x > minimum.distance) {
//                 direction = 'left';
//             } else if (endPoint.y - startPoint.y > minimum.distance) {
//                 direction = 'bottom';
//             } else if (startPoint.y - endPoint.y > minimum.distance) {
//                 direction = 'top';
//             }

//             if (direction) {
//                 callback(direction);
//             }
//         }
//     }, this);
// };
