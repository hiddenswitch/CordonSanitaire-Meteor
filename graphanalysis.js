/**
 * Created by jonathanbobrow on 1/11/16.
 */
GraphAnalysis = (Meteor.isClient ? window : global).GraphAnalysis || {};

/**
 * Status for roads, will be used for coloring them
 * @type {{OPEN: number, CLOSED_EMPTY: number, CLOSED_RESPONDERS: number, CLOSED_CONTAINED: number, CLOSED_ISOLATED: number}}
 */
GraphAnalysis.roadStatus = {
    /**
     * No quarantine here
     */
    OPEN: 0,
    /**
     * Closed quarantine but no one inside.
     */
    CLOSED_EMPTY: 1,
    /**
     * Only healthy people trapped.
     */
    CLOSED_RESPONDERS: 2,
    /**
     * Patient Zero contained with healthy people.
     */
    CLOSED_CONTAINED: 3,
    /**
     * Patient Zero isolated.
     */
    CLOSED_ISOLATED: 4
};

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
        if (!seen.has(parseInt(v))) {
            var nodesInComponent = GraphAnalysis._bfs(graph, parseInt(v));
            components.push(nodesInComponent);
            nodesInComponent.forEach(function (u) {
                seen.add(parseInt(u));
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
    return _.any(components, function (component) { // returns true if any of the components satisfy the predicate
        return _.contains(component, patientZeroRoadId) // returns true if P0 is in the component
            && !_.any(playerRoadIds, function (playerRoadId) {  // returns true if any players are on the component as well
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
GraphAnalysis.checkPatientZero = function (graph, playerRoadIds, patientZeroRoadId) {
    return GraphAnalysis._isPatientZeroIsolated(GraphAnalysis._getComponents(graph), playerRoadIds, patientZeroRoadId);
};


/**
 * Get a single roads status by Id
 * @param graph {Object.<Number, [Number]>} An adjacency list representation of the road network
 * @param roadId {Number} the id of the road whose status we want
 * @param playerRoadIds {[Number]} An array of roadIds which players are on
 * @param patientZeroRoadId {Number} id of the road that Patient Zero is currently on
 */
GraphAnalysis.getRoadStatusById = function (graph, roadId, playerRoadIds, patientZeroRoadId) {

};

/**
 * Get a map of road statuses
 * @param graph {Object.<Number, [Number]>} An adjacency list representation of the road network
 * @param playerRoadIds {[Number]} An array of roadIds which players are on
 * @param patientZeroRoadId {Number} id of the road that Patient Zero is currently on
 * @returns {{}} Road statuses organized by roadId
 */
GraphAnalysis.getRoadStatus = function (graph, playerRoadIds, patientZeroRoadId) {
    var roadStatuses = {};
    var components = GraphAnalysis._getComponents(graph);
    //debugger;

    return roadStatuses;
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