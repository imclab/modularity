var modularity = require('../')
  , assert = require('assert')
  , path = require('path');

function loadTest(num, handler) {
    modularity.load(path.join(__dirname, num + ''), handler);
}

describe('Modularity', function () {

    it('should load modules sync and async modules', function (done) {
        loadTest(1, function (err, foo, bar) {
            assert(!err, err);
            assert.equal(foo, 'oof');
            assert.equal(bar.reverse('foo'), 'oof');
            done();
        });
    });

    it('should error when a dependency can\'t be resolved', function (done) {
        loadTest(2, function (err, foo) {
            assert(err && err.message);
            assert(err.message.indexOf('bar') !== -1);
            loadTest(2, function (err, nonexistent) {
                assert(err && err.message);
                assert(err.message.indexOf('nonexistent') !== -1);
                done();
            });
        });
    });

    it('should look in multiple directories to resolve deps', function (done) {
        modularity.load(
            path.join(__dirname, '2')
          , path.join(__dirname, '1')
          , function (err, foo) {
                assert(!err, err);
                assert.equal(foo, 'raboof');
                done();
            });
    });

    it('should ignore require errors that aren\'t directly related to importing a module', function (done) {
        loadTest(3, function (err, foo) {
            assert(err && err.message);
            assert(err.message.indexOf('notexistent') !== -1);
            done();
        });
    });

    it('should fail when a circular dependency is found', function (done) {
        loadTest(4, function (err, foo) {
            assert(err);
            loadTest('4b', function (err, foo) {
                assert(err);
                done();
            });
        });
    });

    it('should only load dependencies once', function (done) {
        loadTest(5, function (err, foo, bar, config) {
            assert(!err, err);
            assert(config, 1);
            done();
        });
    });

    it('should load external modules unless explicitly told not to', function (done) {
        modularity.load(function (fs, util) {
            assert.equal(typeof fs, 'object');
            assert.equal(typeof util, 'object');
            modularity.includeExternalModules = false;
            modularity.load(function (err, fs) {
                assert(err);
                modularity.includeExternalModules = true;
                done();
            });
        });
    });

    it('should handle the case when a module doesn\'t have any dependencies', function (done) {
        loadTest(6, function (err, foo) {
            assert(!err, err);
            assert.equal(foo, 'foo');
            done();
        });
    });

    it('should let you inject dependencies', function (done) {
        var bar = { reverse: function (str) {
            return str.split('').reverse().join('');
        }};
        modularity.load(
            path.join(__dirname, '2')
          , { bar: bar }
          , function (err, foo) {
                assert(!err, err);
                assert.equal(foo, 'raboof');
                done();
            });
    });

    it('should load dependencies from subdirectories', function (done) {
        loadTest(7, function (err, foo) {
            assert(!err, err);
            assert.equal(foo, 'bar');
            done();
        });
    });

});

