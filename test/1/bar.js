module.exports = function (callback) {
    process.nextTick(function () {
        callback(null, {
            reverse: function (str) {
                return str.split('').reverse().join('');
            }
        });
    });
};

