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
}, {name: "signup"});

Router.route('/login', function () {
    this.render('login');
    $(document.body).css('background-color', '#ffffff');
}, {name: 'login'});

Router.route('/mainmenu', function () {
    this.render('mainmenu');
    $(document.body).css('background-color', '#cccccc');
}, {name: 'mainmenu'});

Router.route('/profile/:userId', function () {
    this.render('profile');
    $(document.body).css('background-color', '#33ccff');
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

    var user = Meteor.users.findOne(userId, {fields: {hasSeenTutorial: 1}});
    var hasSeenTutorial = user.hasSeenTutorial;
    if (!hasSeenTutorial) {
        this.render('tutorial');
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