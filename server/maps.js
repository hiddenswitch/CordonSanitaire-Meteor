/**
 * Created by jonathanbobrow on 12/14/15.
 */
SanitaireMaps = (Meteor.isClient ? window : global).Maps || {};

Meteor.startup(function () {
    // Early exit if Maps already exist.
    if (Maps.find().count() !== 0) {
        return;
    }

    // These are the map IDs to use for new games
    var mapInfos = _.map([
        'London.csv',
        'London_City.csv',
        'London_Floor.csv',
        'Tokyo.csv',
        'Tokyo_Building.csv',
        'Tokyo_Ground.csv',
        'cordon_gradient.csv',
        'cordon_test_01.csv'
    ], function (mapName) {
        return {url: 'assets/tilemaps/csv/' + mapName, _id: mapName};
    });

    _.each(mapInfos, function (mapInfo) {
        var mapUrl = mapInfo.url;
        var mapName = mapInfo._id;
        HTTP.get(Meteor.absoluteUrl(mapUrl), function (error, result) {
            var lines = result.content.split('\n');
            lines = _.filter(lines, function (line) {
                return line != '' && /,/.test(line);
            });

            var tiles = _.map(lines, function (line) {
                return _.map(line.split(','), function (tile) {
                    return parseInt(tile);
                });
            });
            Maps.insert({_id: mapName, tiles: tiles});
        });
    });
});

SanitaireMaps.IPhaserTileMap = function(mapDocument) {
    this.height = mapDocument.tiles.length;
    this.width = mapDocument.tiles[0].length;
    // TODO: Remove the hard coding of tile width and height here
    this.tileWidth = 16;
    this.tileHeight = 16;
    this.__document = mapDocument;
};

SanitaireMaps.IPhaserTile = function(x, y, index) {
    this.x = x;
    this.y = y;
    this.index = index;
};

SanitaireMaps.IPhaserTileMap.prototype.getTile = function(x, y, layer) {
    return new SanitaireMaps.IPhaserTile(x, y, this.__document.tiles[y][x]);
};