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

    /**
     *
     * @param gameId {String} instance of a game
     * @param intersectionId {Number} id of specific intersection under construction
     */
    startConstruction: function(gameId, intersectionId) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        // Reconstruct all the necessary information
        var thisPlayer = Players.findOne({gameId: gameId, userId: this.userId});
        var messageType = Sanitaire.barricadeActions.START_BUILD;

        return Sanitaire.addConstructionMessageToLog(gameId, thisPlayer._id, intersectionId, messageType, new Date());
    },

    /**
     *
     * @param gameId {String} instance of a game
     * @param intersectionId {Number} id of a specifi intersection under construction
     */
    stopConstruction: function(gameId, intersectionId) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        // Reconstruct all the necessary information
        var thisPlayer = Players.findOne({gameId: gameId, userId: this.userId});
        var messageType = Sanitaire.barricadeActions.STOP_BUILD;

        return Sanitaire.addConstructionMessageToLog(gameId, thisPlayer._id, intersectionId, messageType, new Date());
    },

    /**
     *
     * @param gameId {String} instance of a game
     * @param intersectionId {Number} id of a specific intersection under deconstruction
     * @param stopTime {Date} data object of the time deconstruction started
     */
    startDeconstruciton: function(gameId, intersectionId, startTime) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        // Reconstruct all the necessary information
        var thisPlayer = Players.findOne({gameId: gameId, userId: this.userId});
        var messageType = Sanitaire.barricadeActions.START_DEMOLISH;

        return Sanitaire.addConstructionMessageToLog(gameId, thisPlayer._id, intersectionId, messageType, startTime);
    },

    /**
     *
     * @param gameId {String} instance of a game
     * @param intersectionId {Number} id of a specific intersection under deconstruction
     * @param stopTime {Date} data object of the time deconstruction stopped
     */
    stopDeconstruciton: function(gameId, intersectionId, stopTime) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        // Reconstruct all the necessary information
        var thisPlayer = Players.findOne({gameId: gameId, userId: this.userId});
        var messageType = Sanitaire.barricadeActions.STOP_DEMOLISH;

        return Sanitaire.addConstructionMessageToLog(gameId, thisPlayer._id, intersectionId, messageType, stopTime);
    }

});