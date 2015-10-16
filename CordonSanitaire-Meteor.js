// global variable for tasks
Games = new Mongo.Collection('games');
Players = new Mongo.Collection('players');

Meteor.methods({

    joinGame: function (options) {
        // look for latest game
        var games = Games.find({}, {sort: {createdAt: 1}, limit: 1}).fetch();
        var game = games[0];

        // if latest game is filled, create new game
        if (game == undefined || game.isGameFull) {
            console.log("creating a new game");
            game = Games.insert({
                gameId: Random.id().toLowerCase(),
                createdAt: Date.now(),
                joinedPlayerIds: [],
                isGameFull: false
            });
        }

        console.log("got a game with gameId: " + game.gameId + " createdAt: " + game.createdAt);
        //console.log("containing the following players:");
        //for (var i = 0; i < game.joinedPlayerIds.length; i++) {
        //    console.log(game.joinedPlayerIds[i]);
        //}

        // create a player entry
        console.log("creating a player for userId: " + Meteor.userId());
        var player = Players.insert({userId: Meteor.userId(), name: "tempUserName", gameId: game.gameId, state: 'passive'});

        // add player to game
        //game.joinedPlayerIds.push(player);
        //Games.update({_id:game._id}, {joinedPlayerIds: game.joinedPlayerIds});
        
        // if player is the number of max players per game, update 'isGameFull' to true

        return game.gameId;
    }


});

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
            Meteor.call
            Router.go('lobby');
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
        console.log("go get a game");
        Meteor.call('joinGame', function (e, gameId) {
            // reload lobby to show current lobby
            Router.go('lobby', {gameId: gameId});
        });
    }
    else
        console.log("already joined a game with id: " + this.params.gameId);

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