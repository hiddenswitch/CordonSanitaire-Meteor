// global variable for tasks
Games = new Mongo.Collection('games');
Players = new Mongo.Collection('players');

var MAX_PLAYERS = 4;

if (Meteor.isClient) {
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
    })
}

if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
    });
}


var createGame = function (options) {
    var gameId = Random.id().toLowerCase();
    var game = {
        _id: gameId,
        createdAt: Date.now(),
        joinedPlayerIds: [],
        isGameFull: false
    };

    Games.insert(game);

    return game;
};

var addPlayerToGame = function (gameId, userId) {
    var game = Games.findOne(gameId);

    if (!game) {
        throw new Meteor.Error(404, 'Game not found.');
    }

    // check if game already contains a player for this userId
    var player = Players.findOne({gameId:gameId, userId:userId});
    if(!!player)
        return player._id;

    // create a player entry
    var playerId = Players.insert({
        userId: userId,
        name: userId,
        gameId: gameId,
        state: 'passive'
    });

    var updateCommand = {
        $addToSet: {
            joinedPlayerIds: playerId
        }
    };

    // if with our newly added player, we are at max players, set the game to full
    if (game.joinedPlayerIds.length + 1 >= MAX_PLAYERS) {
        updateCommand['$set'] = {isGameFull: true};
    }

    var updateStatus = Games.update({_id: game._id}, updateCommand);
    if (updateStatus === 0) {
        throw new Meteor.Error(500, 'No document changed');
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
            game = createGame(options);
        }

        console.log(game);

        var playerId = addPlayerToGame(game._id, this.userId);
        return {gameId: game._id, playerId: playerId};
    }
});

//--------------------------
// Routes
//--------------------------
Router.route('/', function () {
    this.redirect('/signup');
});

Router.route('/signup', function () {
    // Everything inside this function is reactive
    // If the value of something that is a reactive data source changes in here,
    // it will rerun the ENTIRE function.
    var isLoggedIn = !!Meteor.userId();
    if (isLoggedIn) {
        // Go somewhere else
        this.redirect('/mainmenu');
    } else {
        this.render('signup');
    }
}, {name: "signup"});

Router.route('/login', function () {
    this.render('login');
}, {name: 'login'});

Router.route('/mainmenu', function () {
    this.render('mainmenu');
}, {name: 'mainmenu'});

Router.route('/lobby/:gameId?', function () {
    this.render('lobby');

    if (this.params.gameId == undefined) {
        console.log("no game id... go back to the main menu");
        this.redirect('/mainmenu');
    }
    else
        console.log("you are waiting to join a game with id: " + this.params.gameId);

}, {name: 'lobby'});

Router.route('/game/:gameId', function () {
    this.render('game');
}, {name: 'game'});

Router.route('/tutorial', function () {
    this.render('tutorial');
}, {name: 'tutorial'});

Router.route('/conclusion', function () {
    this.render('conclusion');
}, {name: 'conclusion'});

Router.route('/profile/:userId', function () {
    this.render('profile');
}, {name: 'profile'});