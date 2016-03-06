/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
Games = new Mongo.Collection('games');
Players = new Mongo.Collection('players');
Maps = new Mongo.Collection('maps');

if (Meteor.isServer) {
    Players._ensureIndex({gameId: 1});
}