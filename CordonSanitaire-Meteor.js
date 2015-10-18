// global variable for tasks
Games = new Mongo.Collection('games');
Players = new Mongo.Collection('players');

var max_players = 10;

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
            Meteor.call('joinGame', function (e, gameId) {
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

    Meteor.methods({

        joinGame: function (options) {
            // look for latest game
            var games = Games.find({}, {sort: {createdAt: 1}, limit: 1}).fetch();
            var existing_game = games[0];

            // if latest game is filled, create new game
            if (existing_game == undefined || existing_game.isGameFull) {
                var new_game = createGame(options);
                addPlayerToGame(new_game, this.userId);
                return new_game.gameId;
            }

            else {
                addPlayerToGame(existing_game, this.userId);
                return existing_game.gameId;
            }
        }

    });
}


var createGame = function (options) {
    var gameId = Random.id().toLowerCase();
    var game = Games.insert({
        gameId: gameId,
        createdAt: Date.now(),
        joinedPlayerIds: [],
        isGameFull: false
    });
    return game;
};

var addPlayerToGame = function (game, playerId) {
    // create a player entry
    var player = Players.insert({
        userId: playerId,
        name: playerId,
        gameId: game.gameId,
        state: 'passive'
    });

    // make sure there is an entry for joined player Ids
    if(!game.joinedPlayerIds)
        game.joinedPlayerIds = [];

    // add player to game
    game.joinedPlayerIds.push(player);
    // if player is the number of max players per game, update 'isGameFull' to true
    if(game.joinedPlayerIds.length >= max_players)
        game.isGameFull = true;
    Games.update({_id: game._id}, game);

    return game.gameId;
};

// Routes
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