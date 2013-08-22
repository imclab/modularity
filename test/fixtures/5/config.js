var times_called = 0;

module.exports = function (callback) {
    callback(null, ++times_called);
};

