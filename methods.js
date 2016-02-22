/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 *
 * !!!!IMPORTANT!!!!
 * NOTE: this is only how a person modifies the game state
 **/

Meteor.methods({
    /**
     * Find or create a game (match make) for a user and join that user into the game
     * @returns {{gameId: String, playerId: String}} The game and player ids of the joined game
     */
    matchMakeAndJoin: function () {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        return Sanitaire.matchMakeAndJoin(this.userId);
    },
    /**
     * Quit the provided user from the provided game
     * @param gameId {String}
     */
    quitGame: function (gameId) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        return Sanitaire.quitGame(gameId, this.userId);
    },
    /**
     * Mark the user as having finished the first time user experience
     * @returns {*}
     */
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

    /**
     * Updates the player's position and velocity in the player object
     * @param gameId {String} The game ID the user is interested in updating
     * @param position {{x: number, y: number}} The new position of the player
     * @param velocity {{x: number, y: number}} The new Phaser physics velocity
     * @param updatedAt {Date} The server time when the client issued this command
     * @returns {boolean} True if the record was successfully updated
     */
    updatePositionAndVelocity: function (gameId, position, velocity, updatedAt) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        // Reconstruct all the necessary information
        var thisPlayer = Players.findOne({gameId: gameId, userId: this.userId});

        return Sanitaire.updatePlayerPositionAndVelocity(thisPlayer._id, position, velocity, updatedAt);
    },

    /**
     *
     * @param gameId {String} instance of a game
     * @param intersectionId {Number} id of specific intersection under construction
     */
    startConstruction: function (gameId, intersectionId) {
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
    stopConstruction: function (gameId, intersectionId) {
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
     */
    startDeconstruction: function (gameId, intersectionId) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        // Reconstruct all the necessary information
        var thisPlayer = Players.findOne({gameId: gameId, userId: this.userId});
        var messageType = Sanitaire.barricadeActions.START_DEMOLISH;

        return Sanitaire.addConstructionMessageToLog(gameId, thisPlayer._id, intersectionId, messageType, new Date());
    },

    /**
     *
     * @param gameId {String} instance of a game
     * @param intersectionId {Number} id of a specific intersection under deconstruction
     */
    stopDeconstruction: function (gameId, intersectionId) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        // Reconstruct all the necessary information
        var thisPlayer = Players.findOne({gameId: gameId, userId: this.userId});
        var messageType = Sanitaire.barricadeActions.STOP_DEMOLISH;

        return Sanitaire.addConstructionMessageToLog(gameId, thisPlayer._id, intersectionId, messageType, new Date());
    },

    /**
     * Update patient zero status (isolated/loose)
     * @param gameId {Number}
     * @param patientZeroStatus {String}
     */
    updatePatientZeroStatus: function(gameId, patientZeroStatus){
        return Sanitaire.updatePatientZeroStatus(gameId, patientZeroStatus);
    }

});