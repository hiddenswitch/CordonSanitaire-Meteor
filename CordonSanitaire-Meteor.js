// global variable for tasks
Games = new Mongo.Collection('games');
Players = new Mongo.Collection('players');

Meteor.methods({
    registerUser: function () {

    },

    addPlayer: function (options) {
        var player;

        return Players.insert(player)
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
            Router.go('/lobby');
        },
        'click button#profile': function () {
            Router.go('/profile');
        }

    });
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

Router.route('/profile/:playerId', function () {
    this.render('profile');
}, {name: 'profile'});