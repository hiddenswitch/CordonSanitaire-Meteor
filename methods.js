/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
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

    updatePositionAndVelocity: function(gameId, position, velocity) {
        if (!this.userId) {
            throw new Meteor.Error(403, 'Permission denied.');
        }

        // Reconstruct all the necessary information
        var thisPlayer = Players.findOne({gameId: gameId, userId: this.userId});

        return Sanitaire.updatePlayerPositionAndVelocity(thisPlayer._id, position, velocity);
    }
});