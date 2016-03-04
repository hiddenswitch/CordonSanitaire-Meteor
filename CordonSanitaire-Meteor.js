// global variable for tasks


if (Meteor.isClient) {

    // Prevent scroll
    // Todo: allow player list to scroll in lobby view
    document.addEventListener('touchmove', function (e) {
        e.preventDefault();
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
            Meteor.call('matchMakeAndJoin', function (e, info) {
                var gameId = info.gameId;
                var playerId = info.playerId;
                // load lobby to wait for start of game
                Router.go('game', {gameId: gameId}, {query: {playerId: playerId}});
            });
        },
        'click button#profile': function () {
            Router.go('profile', {userId: Meteor.userId()});
        },
        'click button#tutorial': function () {
            Router.go('tutorial');
        }
    });

    // let's keep the time left in game up to date by attaching an interval
    var timerDependency = new Tracker.Dependency();
    Meteor.setInterval(function () {
        timerDependency.changed();
    }, 10);

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
        },
        showLobbyCountdown: function () {
            var game = Games.findOne(this.gameId, {fields: {playerCount: 1}});
            return (Sanitaire.MAX_PLAYERS - game.playerCount) === 0;
        },
        lobbyCountdownSeconds: function () {
            // returns the current time til start for the lobby
            timerDependency.depend();   // keeps this called every 10ms
            var game = Games.findOne(this.gameId, {fields: {countdownStartTime: 1}});
            var millisSinceCountdownStarted = new Date() - game.countdownStartTime;
            var totalCountdownSeconds = Meteor.settings && Meteor.settings.public && Meteor.settings.public.countdownSeconds || 10;

            var countdown = totalCountdownSeconds - Math.floor(millisSinceCountdownStarted / 1000);
            return countdown;
        }
    });

    Template.game.helpers({
        timeLeftInGame: function () {
            timerDependency.depend();   // keeps this called every 10ms
            var game = Games.findOne(this.gameId, {fields: {startedAt: 1}});
            var timeSinceGameStarted = new Date() - game.startedAt;
            var gameDurationSeconds = Meteor.settings && Meteor.settings.public && Meteor.settings.public.durationSeconds || 45;
            var timeLeft = gameDurationSeconds * 1000.0 - timeSinceGameStarted;
            timeLeft = Math.max(0, Math.min(gameDurationSeconds * 1000, timeLeft));
            var result = {
                "minutes": Math.floor((timeLeft / (60 * 1000.0)) % (60 * 60 * 1000)),
                "seconds": Math.floor((timeLeft / 1000.0) % (60 * 1000)),
                "hundredths": Math.floor((timeLeft / 10.0) % 100)
            };
            return result;
        },
        showingBuildButton: function () {
            return Session.get("showing build button");
        },
        showingDestroyButton: function () {
            return Session.get("showing destroy button");
        },
        showingBuildAndDestroyButtons: function () {
            return Session.get("showing build and destroy buttons");
            ;
        },
        showPatientZeroIsolated: function () {
            return Session.get("patient zero isolated");
        },
        showPatientZeroContained: function () {
            return Session.get("patient zero contained");
        },
        showPatientZeroLoose: function () {
            return Session.get("patient zero loose");
        },
        isGameZoomedOut: function () {
            return Session.get("is game zoomed out");
        },
        updatePatientZeroDirection: function () {
            var angle = Session.get("pzero angle");
            if (!angle) {
                return;
            }
            var angle = -angle; // negative because of how css works
            $('#compass-img').css({
                "-webkit-transform": "rotate(" + angle + "deg)",
                "-moz-transform": "rotate(" + angle + "deg)",
                "transform": "rotate(" + angle + "deg)" /* For modern browsers(CSS3)  */
            });
        },
        updatePatientZeroDistance: function () {
            var distance = Session.get("pzero distance");
            if (!distance) {
                return 0;
            }
            else {
                return Math.round(distance / 8);    // 8 = scale factor for pixels to feet
            }
        }
    });

    Template.conclusion.helpers({
        endGameSynopsis: function () {
            return -1;
        },
        pZeroStatus: function () {
            return -1;
        },
        numQuarantines: function () {
            return -1;
        },
        numBarricades: function () {
            return -1;
        },
        numInjured: function () {
            return -1;
        }
    });

    Template.conclusion.events({
        'click button#mainmenu': function () {
            // go back to mainmenu
            Router.go('mainmenu');
        }
    });

    Template.profile.helpers({
        username: function () {
            return Meteor.userId();
        },
        gamesPlayed: function () {
            return -1;
        },
        gamesSuccesses: function () {
            return -1;
        },
        quarantinesCompleted: function () {
            return -1;
        },
        barricadesBuilt: function () {
            return -1;
        },
        respondersTrapped: function () {
            return -1;
        },
        respondersReleased: function () {
            return -1;
        },
        timesInjured: function () {
            return -1;
        }
    });

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
