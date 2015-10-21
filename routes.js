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

Router.route('/lobby/:gameId?', function () {
    this.render('lobby');
    $(document.body).css('background-color', '#ffffaa');

    if (this.params.gameId == undefined) {
        console.log("no game id... go back to the main menu");
        this.redirect('/mainmenu');
    }
    else
        console.log("you are waiting to join a game with id: " + this.params.gameId);

}, {
    name: 'lobby',
    data: function () {
        return {gameId: this.params.gameId};
    }
});

Router.route('/game/:gameId', function () {
    this.render('game');
    $(document.body).css('background-color', '#333333');
}, {name: 'game'});

Router.route('/tutorial', function () {
    this.render('tutorial');
}, {name: 'tutorial'});

Router.route('/conclusion', function () {
    this.render('conclusion');
    $(document.body).css('background-color', '#ffaa33');
}, {name: 'conclusion'});

Router.route('/profile/:userId', function () {
    this.render('profile');
    $(document.body).css('background-color', '#33ccff');
}, {name: 'profile'});