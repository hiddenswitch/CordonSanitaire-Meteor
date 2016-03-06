/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/

/**
 * Given a fraction of the way between two values,
 * lerp returns the value between v0 and v1
 * @param v0
 * @param v1
 * @param t
 * @returns {number}
 */
lerp = function (v0, v1, t) {
    return v0 * (1 - t) + v1 * t;
};

/**
 * Given a value with a min and max,
 * inverse lerp returns the fraction of the way between low and high
 * @param low {number}
 * @param high {number}
 * @param val {number}
 * @param clamped {boolean}
 * @returns {number}
 */
inverseLerp = function (low, high, val, clamped) {
    if (high == low) {
        return 1;
    }
    var t = (val - low) / (high - low);
    if (clamped) {
        return Math.max(Math.min(t, 1), 0);
    }
    return t;
};