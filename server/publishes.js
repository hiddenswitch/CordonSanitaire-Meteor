/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
Meteor.publish('me', function () {
    return Meteor.users.find({_id: this.userId}, {
        fields: {
            profile: 1,
            username: 1,
            emails: 1,
            hasSeenTutorial: 1,
            cellNumber: 1
        }
    })
});

Meteor.publish('game', function (gameId) {
    if (!gameId) {
        return;
    }

    return [
        Games.find({_id: gameId}),
        Players.find({gameId: gameId})
    ]
});