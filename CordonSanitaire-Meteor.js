// global variable for tasks


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
            Meteor.call('matchMakeAndJoin', function (e, info) {
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
            return Players.find({gameId: Router.current().params.gameId}, {fields: {name: 1}});
        },
        numberOfPlayersNeeded: function () {
            var game = Games.findOne(this.gameId, {fields: {playerCount: 1}});
            return Sanitaire.MAX_PLAYERS - game.playerCount;
        },
        numberOfPlayersPresent: function () {
            var game = Games.findOne(this.gameId, {fields: {playerCount: 1}});
            return game.playerCount;
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
//--------------------------
// Meteor API - Cloud code
//--------------------------
