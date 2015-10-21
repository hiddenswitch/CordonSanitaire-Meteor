// global variable for tasks
Games = new Mongo.Collection('games');
Players = new Mongo.Collection('players');

/**
 * Business logic namespace for Cordon Sanitaire
 * @type {{}}
 */
Sanitaire = {};

var MAX_PLAYERS = 4;

if (Meteor.isClient) {
    Template.dots.onRendered(function () {
        // This gets called in the following order
        // Nothing in HTML
        // Added all HTML inside the template that we can
        // onCreated(function() {})
        // Compute all of the referenced helper functions in the template
        // .helpers({})
        // Insert their rendered content as per their templates
        // onRendered(function() {})

        // Do stuff after I have everything in the template that I could possibly
        // draw drawn based on the helpers

        // This is an instance of a Dots template
        var templateInstance = this;
        // Everything inside autorun will rerun whenever any of its
        // dependencies (think Excel cells) change/update/etc.

        // Create two.js canvas

        var templateArguments = Template.currentData();
        var gameId = templateArguments && templateArguments.gameId;

        // Observe
        // Check docs.meteor.com
        Players.find({gameId: gameId}).observe({
            added: function (document) {
                // initial draw state
            },
            changed: function (newDocument, oldDocument) {
                if (newDocument.connectedPlayerId !== oldDocument.connectedPlayerId) {
                    // draw change
                }
            }
        });

        /*
         templateInstance.autorun(function () {
         // This will be a reactive call to the arguments of the
         // template invoke. IE
         // {{> dots gameId='dijfoasjf'}}
         // Template.currentData() == {gameId: 'dijfoasjf'}
         var templateArguments = Template.currentData();
         var gameId = templateArguments && templateArguments.gameId;
         // REACTIVE! Whenever ANY field in ANY player with this gameId changes,
         // the ENTIRE function passed to autorun (this function) gets executed.
         var players = Players.find({gameId: gameId}).fetch();

         // Now, pretend this is a traditional render function which
         // has to deal with the current state of the canvas etc etc
         // It should work well with two.js
         // $ == this.findAll == document.querySelectorAll
         var instance = Template.instance();
         instance.findAll('#dots')[0].innerHTML = _.pluck(players, 'name').join(', ');
         });
         */
    });

    Template.signup.helpers({});

    Template.signup.events({
        'click button#guest': function () {
            // submit sign up information
            var username = Random.id().toLowerCase();
            var password = Random.secret();
            Accounts.createUser({username: username, password: password});
        }
    });

    Template.mainmenu.events({
        'click button#play': function () {
            // find a game to join
            Meteor.call('joinGame', function (e, info) {
                var gameId = info.gameId;
                var playerId = info.playerId;
                // load lobby to wait for start of game
                Router.go('lobby', {gameId: gameId});
            });
        },
        'click button#profile': function () {
            Router.go('profile', {userId: Meteor.userId()});
        }

    });

    Template.lobby.helpers({
        players: function () {
            return Players.find({gameId: Router.current().params.gameId})
        }
    });

    Template.conclusion.helpers({});

    Template.conclusion.events({
        'click button#mainmenu': function () {
            // go back to mainmenu
            Router.go('mainmenu');
        }
    });

    Template.profile.helpers({});

    Template.profile.events({
        'click button#mainmenu': function () {
            // go back to mainmenu
            Router.go('mainmenu');
        }
    });
}

if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
    });

    // start a game when it is full with a countdown for 10 seconds
    // then keep track of the time for the length of the game
    // then send players to the conclusion after the game ends
    // players can navigate away from the conclusion via GUI
    //
    //var startGame = function (gameId) {
    //
    //};
}

/**
 * Get a random location on the game board, given certain constraints in options
 * @param options
 * @returns {{x: number, y: number}}
 */
Sanitaire.getRandomLocationOnBoard = function (options) {
    // TODO: Compute a valid random location
    return {x: Math.random() * 100, y: Math.random() * 100};
};

/**
 * Creates a game
 * @param options
 * @returns {String} The game ID
 */
Sanitaire.createGame = function (options) {
    var ownerUserId = options && options.ownerUserId;
    var gameId = Random.id().toLowerCase();
    var game = {
        _id: gameId,
        createdAt: Date.now(),
        joinedPlayerIds: [],
        joinedUserIds: [],
        playerCount: 0,
        isGameFull: false
    };

    Games.insert(game);

    return game._id;
};

Sanitaire.startCountdownForGame = function (gameId) {
    // TODO: Start the countdown to transition the game.
    // TODO: Should check if the countdown has already started, in case this is called more than once
    // TODO: Possibly should reset the countdown if another player has joined in the meantime.
};

Sanitaire.addPlayerToGame = function (gameId, userId) {
    var game = Games.findOne(gameId);

    if (!game) {
        if (Meteor.isClient) {
            return;
        }

        throw new Meteor.Error(404, 'Game not found.');
    }

    // check if game already contains a player for this userId
    var player = Players.findOne({gameId: gameId, userId: userId});
    if (!!player) {
        return player._id;
    }

    var playerLocation = Sanitaire.getRandomLocationOnBoard();

    // create a player entry
    var playerId = Players.insert({
        userId: userId,
        name: userId,
        gameId: gameId,
        location: playerLocation
    });

    var updateCommand = {
        $addToSet: {
            joinedPlayerIds: playerId,
            joinedUserIds: userId
        },
        $inc: {
            playerCount: 1
        }
    };

    var shouldStartGame = false;
    // if with our newly added player, we are at max players, set the game to full
    if (game.joinedPlayerIds.length + 1 >= MAX_PLAYERS) {
        updateCommand['$set'] = {isGameFull: true};

        // Start the game
        shouldStartGame = true;
    }

    var updateStatus = Games.update({_id: game._id}, updateCommand);
    if (updateStatus === 0) {
        throw new Meteor.Error(500, 'No document changed');
    }

    if (shouldStartGame) {
        Sanitaire.startCountdownForGame(game._id);
    }

    return playerId;
};

//--------------------------
// Meteor API - Cloud code
//--------------------------
Meteor.methods({
    joinGame: function (options) {
        // look for latest game
        var game = Games.findOne({isGameFull: false}, {sort: {createdAt: -1}, limit: 1});

        if (!game) {
            // TODO: Should be different options.
            game = {_id: Sanitaire.createGame(options)};
        }

        var playerId = Sanitaire.addPlayerToGame(game._id, this.userId);
        return {gameId: game._id, playerId: playerId};
    }
});