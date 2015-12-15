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
                Router.go('game', {gameId: gameId}, {query: {playerId: playerId}});
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

    // let's keep the time left in game up to date by attaching an interval
    var timerDependency = new Tracker.Dependency();
    Meteor.setInterval(function () {
        timerDependency.changed();
    }, 10);

    Template.game.helpers({
        timeLeftInGame: function () {
            timerDependency.depend();   // keeps this called every 10ms
            var game = Games.findOne(this.gameId, {fields: {startedAt: 1}});
            var timeSinceGameStarted = new Date() - game.startedAt;
            var gameDurationSeconds = 45; //Meteor.settings && Meteor.settings.durationSeconds || 45;
            var timeLeft = gameDurationSeconds * 1000.0 - timeSinceGameStarted;
            timeLeft = Math.max(0, Math.min(gameDurationSeconds * 1000, timeLeft));
            var result = {
                "minutes": Math.floor((timeLeft / (60 * 1000.0)) % (60 * 60 * 1000)),
                "seconds": Math.floor((timeLeft / 1000.0) % (60 * 1000)),
                "hundredths": Math.floor((timeLeft / 10.0) % 100)
            };
            return result;
        },

        showingBuildButtons: function () {
            return Session.get("showing build buttons");
        },

        showingDestroyButton: function () {
            return Session.get("showing destroy button");
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
