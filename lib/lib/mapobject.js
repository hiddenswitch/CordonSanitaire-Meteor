/**
 * Created by jonathanbobrow on 1/21/16.
 */
_.mixin({
    mapObject: function (obj, iteratee, context) {
        iteratee = cb(iteratee, context);
        var keys = _.keys(obj),
            length = keys.length,
            results = {},
            currentKey;
        for (var index = 0; index < length; index++) {
            currentKey = keys[index];
            results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
        }
        return results;
    }
});