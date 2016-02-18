/**
 * Created by jonathanbobrow on 1/11/16.
 */
GraphAnalysis = (Meteor.isClient ? window : global).GraphAnalysis || {};

/**
 * Get information about each component (in the graph theoretic sense) of the road network
 * @param graph {Object.<Number, [Number]>} An adjacency list representation of the road network
 * @param infoForNode {Object.<Number, {}>} A dictionary of additional metadata for a particular node
 * @private
 */
GraphAnalysis._getComponents = function (graph) {
    var seen = new Set();
    var components = [];
    _.each(graph, function (us, v) {
        if (!seen.has(v)) {
            var nodesInComponent = GraphAnalysis._bfs(graph, v);
            components.push(nodesInComponent);
            components.forEach(function (u) {
                seen.add(u);
            });
        }
    });

    // Do analysis on components

    // Return components
    return components;
};

/**
 * Is patient zero isolated?
 * @param components {[[Number]]} An array of arrays of road ids representing components in a graph theoretic sense
 * @param playerRoadIds {[Number]} An array of road ids containing players
 * @param patientZeroRoadId {Number} The road id corresponding to the location of patient zero
 * @private
 */
GraphAnalysis._isPatientZeroIsolated = function (components, playerRoadIds, patientZeroRoadId) {
    return _.any(components, function (component) {
        return _.contains(component, patientZeroRoadId)
            && !_.any(playerRoadIds, function (playerRoadId) {
                return _.contains(component, playerRoadId);
            });
    });
};

/**
 * Get a state for Patient Zero (currently just isolated or not)...
 * @param graph {Object.<Number, [Number]>} An adjacency list representation of the road network
 * @param playerRoadIds {[Number]} An array of roadIds which players are on
 * @param patientZeroRoadId {Number} id of the road that Patient Zero is currently on
 */
GraphAnalysis.checkPatientZero = function(graph, playerRoadIds, patientZeroRoadId) {
    return GraphAnalysis._isPatientZeroIsolated(GraphAnalysis._getComponents(graph), playerRoadIds, patientZeroRoadId);
};

/**
 *  Breadth First Search
 * @param graph {Object.<Number, [Number]>} An adjacency list representation of the road network
 * @param source {*}
 * @returns {Array}
 * @private
 */
GraphAnalysis._bfs = function (graph, source) {
    var nodes = [];
    var seen = new Set();
    var nextLevel = new Set([source]);
    while (nextLevel.size > 0) {
        var thisLevel = nextLevel;
        nextLevel = new Set();
        thisLevel.forEach(function (v) {
            if (!seen.has(v)) {
                nodes.push(v);
                seen.add(v);
                graph[v].forEach(function (u) {
                    nextLevel.add(u);
                });
            }
        });
    }
    return nodes;
};