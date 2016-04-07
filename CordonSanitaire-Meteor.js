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
        },
        'click button#submit_sms': function () {
            // get cell number from dom
            var cellNumber = document.getElementById("sms_number").value;
            // submit number to server
            Meteor.call('addSMSNumber', cellNumber, function (error, info) {
                if (error) {
                    //console.log("let's ask again politely", error); // Catch the
                    alert(cellNumber + " is not a recognized cell number");
                    console.log(cellNumber, "is not a recognized cell number");
                }
                else {
                    if (!info) {
                        // if number entered was null
                        alert("please enter a cell number");
                        console.log("please enter a cell number");
                    }
                    else {
                        // SUCCESS, let the user know we'll text them!
                        console.log("show that we'll text this number as a receipt", info);
                    }
                }
            });
        }
    });

    // let's keep the time til next game up to date by attaching an interval
    var timerTilNextGameDependency = new Tracker.Dependency();
    Meteor.setInterval(function () {
        timerTilNextGameDependency.changed();
    }, 1000);

    Template.mainmenu.helpers({
        showPlayButton: function () {
            timerTilNextGameDependency.depend(); // keeps this called every 1000ms
            if (Sanitaire.TIME_RESTRICTED_ENTRY === "NO_RESTRICTION") {
                return true;
            }
            else {
                var date = new Date();
                return _.indexOf(Sanitaire.TIME_RESTRICTED_ENTRY, date.getMinutes()) != -1;
            }
        },
        showTextSignUp: function () {
            var userId = Meteor.userId();
            var user = Meteor.users.findOne(userId, {fields: {sms: 1}});
            var sms = user.sms;
            return (sms === null);
        },
        cellNumber: function () {
            var userId = Meteor.userId();
            var user = Meteor.users.findOne(userId, {fields: {sms: 1}});
            var sms = user.sms;
            if (sms != null) {
                return sms.number;
            }
            else {
                console.log("odd, no number on record");
                return '(555)555-1234';
            }
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
        },
        secondsTilExpire: function () {
            timerDependency.depend();   // keeps this called every 10ms
            var game = Games.findOne(Router.current().params.gameId);
            var now = new Date();
            var secondsTilExpire = Sanitaire.MAX_LOBBY_TIME_SECONDS - Math.ceil((now - game.lastPlayerJoinedAt)/1000);
            // color the number red if getting low...
            if(secondsTilExpire <= 5) {
                document.getElementById("lobbyExpireTime").style.color = '#FF0000';
                document.getElementById("lobbyExpireTime").style.fontWeight = 'bold';
            }else {
                document.getElementById("lobbyExpireTime").style.color = '#000000';
                document.getElementById("lobbyExpireTime").style.fontWeight = 'normal';
            }
            // clamp
            secondsTilExpire = secondsTilExpire < 0 ? 0 : secondsTilExpire;
            return secondsTilExpire;
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
        gameBottomPadding: function () {
            // Note: This extends the game div to fill the blank space underneath the canvas...
            // this will probably be filled with background art at some point, but does need to be dynamic to window size
            var padding = window.innerHeight - 490; // 90px is top padding, and gameboard is 400px tall
            return padding > 0 ? padding : 0;
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

    Template.expired.events({
        'click button#mainmenu': function () {
            // go back to mainmenu
            Router.go('mainmenu');
        }
    });
}
//--------------------------
// Meteor API - Cloud code
//--------------------------

if (Meteor.isServer) {
    /* Create a Cron Object */
    Cron = {};
    /* Create a private startup method */
    Cron._startup = function () {
        if (Meteor.isClient) {
            return;
        }
        Cron.jobs();
        return SyncedCron.start();
    };

    /* Using encapsulation lets store this function */

    Cron.initialize = function () {
        return Cron._startup();
    };
    /* Let's startup! */
    Meteor.startup(Cron.initialize);

    // Our Twilio Number
    var twilioNumber;
    var accountSid;
    var authToken;
    if (!_.isUndefined(Meteor.settings)
        && !_.isUndefined(Meteor.settings.private)
        && !_.isUndefined(Meteor.settings.private.twilio.account_sid)
        && !_.isUndefined(Meteor.settings.private.twilio.auth_token)
        && !_.isUndefined(Meteor.settings.private.twilio.number)) {
        accountSid = Meteor.settings.private.twilio.account_sid;
        authToken = Meteor.settings.private.twilio.auth_token;
        twilioNumber = Meteor.settings.private.twilio.number;
    }

    var twilio = Twilio(accountSid, authToken);

    var sendMessageToNumbers = function (message, numbers) {
        /* SEE TWILIO API DOCS HERE: http://twilio.github.io/twilio-node/ */
        _.each(numbers, function (number) {
            twilio.messages.create({
                to: number,
                from: twilioNumber,
                body: message

            }, function (err, res) {
                if (err) {
                    console.log(err);
                }
                if (!err) {
                    console.log(res.from);
                    console.log(res.body);
                }
            });
        });
    };

    var findUsersToSMS = function () {
        /* do something here */
        // look to see who is signed up to receive a text message now
        var date = new Date();
        var currentHour = (date.getHours() + 1) % 24;   // this is related to the 59th minute... i.e. text those signed up for the next hour
        var users = Meteor.users.find({"sms.hourToText": currentHour}).fetch()

        return users;
    };

    Cron.jobs = function () {
        SyncedCron.add({
            name: "Twilio Cron Job",
            schedule: function (parser) {
                return parser.recur().on(59).minute(); // called on the 59th minute...
            },
            job: function () {
                var users = findUsersToSMS();
                var numbers = users.map(function (user) {
                    return user.sms.number;
                });
                var message = 'FAKE URGENT. Patient Zero detected with contagion. Response needed! http://cordon.meteorapp.com';
                console.log("sending text message to these numbers", numbers);
                //sendMessageToNumbers(message, numbers);
            }
        });

        // clean up the empty games
        SyncedCron.add({
            name: "Clean up lobbies",
            schedule: function (parser) {
                return parser.recur().every().second(); // called every second (needed to quickly expire games)
            },
            job: function () {
                // take a look at game lobbies not in a complete state...
                // in theory, there should only ever be a single game in lobby state at a time
                gamesInLobbyState = Games.find({"state": Sanitaire.gameStates.LOBBY}).fetch();
                _.each(gamesInLobbyState, function (game) {
                    var now = new Date();
                    // check to see last time someone joined the lobby
                    var lastPlayerJoinedAt = new Date(game.lastPlayerJoinedAt);
                    console.log("game in state: ", game.state, lastPlayerJoinedAt, game.joinedUserIds);
                    var timeOfExpiration = new Date(lastPlayerJoinedAt.getTime() + Sanitaire.MAX_LOBBY_TIME_SECONDS * 1000);
                    var timeTilExpiration = timeOfExpiration - now;
                    if (timeTilExpiration <= 0) {
                        console.log("this should be expired");
                        Sanitaire._expireGame(game._id);
                    }
                    else {
                        console.log("not yet expired");
                    }
                });
                // FOR DEBUG PURPOSES, SHOW EXPIRED GAMES
                //gamesInExpiredState = Games.find({"state": Sanitaire.gameStates.EXPIRED}).fetch();
                //// check to see their creation time
                //_.each(gamesInExpiredState, function (game) {
                //    var createdDate = new Date(game.createdAt);
                //    console.log("game in state: ", game.state, createdDate, game.joinedUserIds);
                //});
            }
        });

    };
}