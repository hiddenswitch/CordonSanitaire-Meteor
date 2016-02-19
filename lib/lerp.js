/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
lerp = function (v0, v1, t) {
    return v0 * (1 - t) + v1 * t;
};

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