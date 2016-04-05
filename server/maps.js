/**
 * Created by jonathanbobrow on 12/14/15.
 */
SanitaireMaps = (Meteor.isClient ? window : global).Maps || {};

Meteor.startup(function () {

    // These are the map IDs to use for new games
    var mapInfos = _.map([
        'London.csv',
        'Tokyo.csv',
        'Simple_Single_01.csv',
        'Simple_Single_02.csv',
        'Simple_40.csv',
        'Simple_40_50.csv',
        'Simple_40_50_Members_01.csv',
        'Simple_60_80.csv',
        'Simple_46_60.csv',
        'Simple_56_60.csv'
    ], function (mapName) {
        return {url: 'assets/tilemaps/csv/' + mapName, _id: mapName};
    });

    _.each(mapInfos, function (mapInfo) {
        var mapUrl = mapInfo.url;
        var mapName = mapInfo._id;

        if (Maps.find(mapName).count() !== 0) {
            return;
        }

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

            //Todo: add the graph representation of the map here
            Maps.insert({_id: mapName, tiles: tiles});
        });
    });
});

SanitaireMaps.IPhaserTileMap = function (mapDocument) {
    this.height = mapDocument.tiles.length;
    this.width = mapDocument.tiles[0].length;
    // TODO: Remove the hard coding of tile width and height here
    this.tileWidth = 16;
    this.tileHeight = 16;
    this._document = mapDocument;
    this.tiles = mapDocument.tiles;
};

SanitaireMaps.IPhaserTile = function (x, y, index) {
    this.x = x;
    this.y = y;
    this.index = index;
};

SanitaireMaps.IPhaserTileMap.prototype.getTile = function (x, y, layer) {
    return new SanitaireMaps.IPhaserTile(x, y, this._document.tiles[y][x]);
};