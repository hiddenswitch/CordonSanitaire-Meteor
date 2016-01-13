/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 *
 * !!!!IMPORTANT!!!!
 * NOTE: this is only how a person modifies the game state
 **/

Meteor.methods({
    matchMakeAndJoin: function () {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        return Sanitaire.matchMakeAndJoin(this.userId);
    },
    connectToPlayer: function (destinationPlayerId) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        // Reconstruct all the necessary information
        var destinationPlayer = Players.findOne(destinationPlayerId);
        var gameId = destinationPlayer.gameId;
        var thisPlayer = Players.findOne({gameId: gameId, userId: this.userId});
        return Sanitaire.tryConnectPlayers(thisPlayer._id, destinationPlayer._id);
    },
    quitGame: function (gameId) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        return Sanitaire.quitGame(gameId, this.userId);
    },
    finishTutorial: function () {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        return Meteor.users.update(this.userId, {
            $set: {
                hasSeenTutorial: true
            }
        });
    },

    updatePositionAndVelocity: function(gameId, position, velocity, updatedAt) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        // Reconstruct all the necessary information
        var thisPlayer = Players.findOne({gameId: gameId, userId: this.userId});

        return Sanitaire.updatePlayerPositionAndVelocity(thisPlayer._id, position, velocity, updatedAt);
    },

    addQuarantine: function(gameId, position, intersectionId) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        // TODO: Security

        return Sanitaire.addQuarantine(gameId, position, intersectionId);
    },

    startConstruction: function(gameId, position, intersectionId, startTime) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        return Sanitaire.addConstructionMessageToLog(gameId, playerId, messageType, time);
    },

    stopConstruction: function(gameId, position, intersectionId, stopTime) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

    },

    startDeconstruciton: function(gameId, position, intersectionId, startTime) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

    },

    stopDeconstruciton: function(gameId, position, intersectionId, stopTime) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

    }

});