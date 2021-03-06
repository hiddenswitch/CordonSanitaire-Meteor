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
 * Patient Zero status
 * TODO: This might belong in patient zero... (but only used here for now)
 * @type {{LOOSE: number, CONTAINED: number, ISOLATED: number}}
 */
GraphAnalysis.pzerostatus = {
    /**
     * No quarantine here
     */
    LOOSE: 0,
    /**
     * Closed quarantine but no one inside.
     */
    CONTAINED: 1,
    /**
     * Only healthy people trapped.
     */
    ISOLATED: 2
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
 * @param numRoads {Number} the total number of roads, help with determining inside or outside
 * @private
 */
GraphAnalysis._isPatientZeroIsolated = function (components, playerRoadIds, patientZeroRoadId, numRoads) {

    var pZeroComponent = _.find(components, function (component) {
        return _.contains(component, patientZeroRoadId);
    });

    return GraphAnalysis._getComponentStatus(pZeroComponent, playerRoadIds, patientZeroRoadId, numRoads) === GraphAnalysis.roadStatus.CLOSED_ISOLATED;
};

/**
 * Is patient zero contained?
 * @param components {[[Number]]} An array of arrays of road ids representing components in a graph theoretic sense
 * @param playerRoadIds {[Number]} An array of road ids containing players
 * @param patientZeroRoadId {Number} The road id corresponding to the location of patient zero
 * @param numRoads {Number} the total number of roads, help with determining inside or outside
 * @private
 */
GraphAnalysis._isPatientZeroContained = function (components, playerRoadIds, patientZeroRoadId, numRoads) {

    var pZeroComponent = _.find(components, function (component) {
        return _.contains(component, patientZeroRoadId);
    });

    return GraphAnalysis._getComponentStatus(pZeroComponent, playerRoadIds, patientZeroRoadId, numRoads) === GraphAnalysis.roadStatus.CLOSED_CONTAINED;
};

/**
 * Get a state for Patient Zero (currently just isolated or not)...
 * @param graph {Object.<Number, [Number]>} An adjacency list representation of the road network
 * @param playerRoadIds {[Number]} An array of roadIds which players are on
 * @param patientZeroRoadId {Number} id of the road that Patient Zero is currently on
 * @param numRoads {Number} the total number of roads, help with determining inside or outside
 * @returns {Number} pzerostatus
 */
GraphAnalysis.checkPatientZero = function (graph, playerRoadIds, patientZeroRoadId, numRoads) {
    var components = GraphAnalysis._getComponents(graph);

    if (GraphAnalysis._isPatientZeroIsolated(components, playerRoadIds, patientZeroRoadId, numRoads)) {
        return GraphAnalysis.pzerostatus.ISOLATED;
    }
    else if (GraphAnalysis._isPatientZeroContained(components, playerRoadIds, patientZeroRoadId, numRoads)) {
        return GraphAnalysis.pzerostatus.CONTAINED;
    }
    else {
        return GraphAnalysis.pzerostatus.LOOSE;
    }
};


/**
 * Get a single roads status by Id
 * @param graph {Object.<Number, [Number]>} An adjacency list representation of the road network
 * @param roadId {Number} the id of the road whose status we want
 * @param playerRoadIds {[Number]} An array of roadIds which players are on
 * @param patientZeroRoadId {Number} id of the road that Patient Zero is currently on
 * @param numRoads {Number} the total number of roads, help with determining inside or outside
 * @returns {Number} a type of road status
 */
GraphAnalysis.getRoadStatusById = function (graph, roadId, playerRoadIds, patientZeroRoadId, numRoads) {
    // checks which component the road is part of and then returns that component's status
    var components = GraphAnalysis._getComponents(graph);
    var component = _.find(components, function (component) {
        return _.contains(component, roadId);
    });

    if (!component) {
        console.log("No component found for road: ", roadId);
        return GraphAnalysis.roadStatus.OPEN;
    }

    return GraphAnalysis._getComponentStatus(component, playerRoadIds, patientZeroRoadId, numRoads);
};

/**
 * Get a map of road statuses
 * @param graph {Object.<Number, [Number]>} An adjacency list representation of the road network
 * @param playerRoadIds {[Number]} An array of roadIds which players are on
 * @param patientZeroRoadId {Number} id of the road that Patient Zero is currently on
 * @param numRoads {Number} the total number of roads, help with determining inside or outside
 * @returns {{GraphAnalysis.roadStatus}} Road statuses organized by roadId
 */
GraphAnalysis.getRoadStatus = function (graph, playerRoadIds, patientZeroRoadId, numRoads) {
    var roadStatuses = {};
    var components = GraphAnalysis._getComponents(graph);

    _.each(components, function (component) {
        var roadStatus = GraphAnalysis._getComponentStatus(component, playerRoadIds, patientZeroRoadId, numRoads);
        _.each(component, function (roadId) {
            roadStatuses[roadId] = roadStatus;
        });
    });

    return roadStatuses;
};

/**
 * Gets the status of a single component (group of roads)
 * @param component {[Number]} group of roadIds
 * @param playerRoadIds {[Number]} roadIds occupied by responders
 * @param patientZeroRoadId {Number} roadId occupied by Patient Zero
 * @param numRoads {Number} the total number of roads, help with determining inside or outside
 * @returns {GraphAnalysis.roadStatus} status of the component
 */
GraphAnalysis._getComponentStatus = function (component, playerRoadIds, patientZeroRoadId, numRoads) {
    var componentStatus;

    var doesContainPatientZero = _.contains(component, patientZeroRoadId);

    var doesContainResponders = _.any(playerRoadIds, function (playerRoadId) {
        return _.contains(component, playerRoadId);
    });

    // check and see if this is the largest component... or some other way of determining inside or outside...
    // the quarantine must not contain more than half of the map to be a successful quarantine.
    if (component.length > (2 * numRoads / 3)) {
        return GraphAnalysis.roadStatus.OPEN;
    }

    if (doesContainPatientZero && !doesContainResponders) {
        // isolated
        componentStatus = GraphAnalysis.roadStatus.CLOSED_ISOLATED;
    }
    else if (doesContainPatientZero && doesContainResponders) {
        // contained
        componentStatus = GraphAnalysis.roadStatus.CLOSED_CONTAINED;
    }
    else if (!doesContainPatientZero && doesContainResponders) {
        // responders present
        componentStatus = GraphAnalysis.roadStatus.CLOSED_RESPONDERS;
    }
    else if (!doesContainPatientZero && !doesContainResponders) {
        // empty
        componentStatus = GraphAnalysis.roadStatus.CLOSED_EMPTY;
    }

    return componentStatus;
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