/*jshint unused:false */

var modularity = require('../')
  , assert = require('assert')
  , path = require('path');

function loadTest(num, handler) {
    return modularity.include(path.join(__dirname, 'fixtures', num + '')).load(handler);
}

describe('Modularity', function () {

    it('should load modules sync and async modules', function (done) {
        loadTest(1, function (foo, bar) {
            assert.equal(foo, 'oof');
            assert.equal(bar.reverse('foo'), 'oof');
            done();
        });
    });

    it('should error when a dependency can\'t be resolved', function (done) {
        loadTest(2, function (nonexistent) {
            assert(false, 'Expected an error');
        }).on('error', function (err) {
            assert(err.message.indexOf('nonexistent') !== -1);
            done();
        });
    });

    it('should error when a nested dependency can\'t be resolved', function (done) {
        loadTest(2, function (foo) {
            assert(false, 'Expected an error');
        }).on('error', function (err) {
            assert(err.message.indexOf('bar') !== -1);
            done();
        });
    });

    it('should load when no dependencies are supplied', function (done) {
        loadTest(2, function () {
            done();
        });
    });

    it('should look in multiple directories to resolve deps', function (done) {
        modularity
            .include(path.join(__dirname, 'fixtures', '2'), path.join(__dirname, 'fixtures', '1'))
            .load(function (foo) {
                assert.equal(foo, 'raboof');
                done();
            });
    });

    it('should ignore require errors that aren\'t directly related to importing a module', function (done) {
        loadTest(3, function (foo) {
            assert(false, 'Expected an error');
        }).on('error', function (err) {
            assert(err.message.indexOf('notexistent') !== -1);
            done();
        });
    });

    it('should fail when a circular dependency if found', function (done) {
        loadTest('4b', function (foo) {
            assert(false, 'Expected an error');
        }).on('error', function (err) {
            assert(err.message.indexOf('Circular dependency') !== -1);
            done();
        });
    });

    it('should fail when a circular dependency is found in a nested dependency', function (done) {
        loadTest(4, function (foo) {
            assert(false, 'Expected an error');
        }).on('error', function (err) {
            assert(err.message.indexOf('Circular dependency') !== -1);
            done();
        });
    });

    it('should only load dependencies once', function (done) {
        loadTest(5, function (foo, bar, config) {
            assert(config, 1);
            done();
        });
    });

    it('should handle the case when a module doesn\'t have any dependencies', function (done) {
        loadTest(6, function (foo) {
            assert.equal(foo, 'foo');
            done();
        });
    });

    it('should let you inject dependencies', function (done) {
        var bar = { reverse: function (str) {
            return str.split('').reverse().join('');
        }};
        modularity
            .include(path.join(__dirname, 'fixtures', '2'))
            .inject({ bar: bar })
            .load(function (foo) {
                assert.equal(foo, 'raboof');
                done();
            });
    });

    it('should support angular.js style array syntax for subdirectories', function (done) {
        loadTest(9, function (foo) {
            assert.equal(foo, 'bazfooqux');
            done();
        });
    });

    it('should support angular.js style array syntax in the top-level load function', function (done) {
        loadTest(9, ['bar/baz_foo', function (foo) {
            assert.equal(foo, 'foo');
            done();
        }]);
    });

    it('should include global modules by default', function (done) {
        loadTest(1, function (fs) {
            assert(fs.readFile);
            done();
        });
    });

    it('should not include global modules when asked not to', function (done) {
        var instance = new modularity.Modularity({ include_global: false });
        instance.load(function (fs) {
            assert(false, 'Expected an error');
        }).on('error', function () {
            done();
        });
    });

    it('should load all modules in a directory', function (done) {
        loadTest(10, function (foo, qux) {
            assert.equal(foo.bar, 'barqux');
            assert.equal(foo.qux, 'qux');
            assert.equal(qux, 'foobar');
            assert.equal(Object.keys(foo).length, 2);
            assert(!('empty' in foo));
            done();
        });
    });

    it('should fail when a directory contains a circular dependency', function (done) {
        loadTest(11, function (foo) {
            assert(false, 'Expected an error');
        }).on('error', function (err) {
            assert(err.message.indexOf('Circular dependency') !== -1);
            done();
        });
    });

    it('should fail when a directory module tries to include the directory', function (done) {
        loadTest(12, function (foo) {
            assert(false, 'Expected an error');
        }).on('error', function (err) {
            assert(err.message.indexOf('Circular dependency') !== -1);
            done();
        });
    });

    it('should let you inject modules from a directory', function (done) {
        var inject = {};
        inject['foo/qux'] = 'injected';
        modularity
            .include(path.join(__dirname, 'fixtures', '10'))
            .inject(inject)
            .load(function (foo) {
                assert.equal(foo.bar, 'barinjected');
                done();
            });
    });

});

