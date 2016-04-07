/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/

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
    $(document.body).css('background-color', '#ffffff');
}, {name: "signup"});

Router.route('/login', function () {
    this.render('login');
    $(document.body).css('background-color', '#ffffff');
}, {name: 'login'});

Router.route('/mainmenu', function () {
    var userId = Meteor.userId();

    var isLoggedIn = !!userId;
    if (!isLoggedIn) {
        this.redirect('/signup');
        return;
    }

    // Check to see if user has seen the tutorial, and show it before game if not yet seen
    // (Comment this out if we only want players to access tutorial on their own)
    var user = Meteor.users.findOne(userId);
    var hasSeenTutorial = user.hasSeenTutorial;
    console.log(user);
    if (!hasSeenTutorial) {
        this.redirect('tutorial');
        return;
    }

    this.render('mainmenu');
    $(document.body).css('background-color', '#ffffff');
}, {name: 'mainmenu'});

// this gives permission to the client to update the Meteor.users collection
// but only for themselves... sorry hackerzzz
//Meteor.users.allow({
//   update:function(userId, doc) {
//       return userId === doc._id;
//   }
//});

Router.route('/tutorial', function () {
    var userId = Meteor.userId();

    // update the user to show that they have seen the tutorial
    Meteor.call('finishTutorial', function(error, info) {
        console.log("finish tutorial callback", error, info);
    });

    this.render('tutorial');
    $(document.body).css('background-color', '#ffffff');
}, {name: 'tutorial'});

Router.route('/options/:userId', function () {
    var userId = Meteor.userId();
    var user = Meteor.users.findOne(userId, {fields: {sms: 1}});
    var sms = user.sms;
    if (sms != null) {
    }
    this.render('options');
    $(document.body).css('background-color', '#ffffff');
}, {name: 'options'});

Router.route('/profile/:userId', function () {
    this.render('profile');
    $(document.body).css('background-color', '#ffffff');
}, {name: 'profile'});

/**
 * The global game route. Automatically renders the appropriate page template based on the status of the game. Should
 * be reactive to the game states.
 */
Router.route('/g/:gameId', function () {
    var userId = Meteor.userId();

    var isLoggedIn = !!userId;
    if (!isLoggedIn) {
        this.render('signup');
        return;
    }

    var gameId = this.params && this.params.gameId;
    var game = Games.findOne(gameId, {fields: {state: 1}});

    if (!game) {
        this.render('loading');
        return;
    }

    switch (game.state) {
        case Sanitaire.gameStates.LOBBY:
        case Sanitaire.gameStates.COUNTDOWN:
            this.render('lobby');
            return;
        case Sanitaire.gameStates.IN_PROGRESS:
            this.render('game');
            return;
        case Sanitaire.gameStates.ENDED:
            this.render('conclusion');
            return;
        default:
            this.render('loading');
            return;
    }
}, {
    name: 'game',
    data: function () {
        var gameId = this.params && this.params.gameId;
        var playerId = this.params && this.params.query.playerId;
        return {gameId: gameId, playerId: playerId};
    },
    subscriptions: function () {
        var gameId = this.params && this.params.gameId;
        return [
            Meteor.subscribe('game', gameId)
        ]
    }
});