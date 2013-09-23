var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , fs = require('fs')
  , path = require('path');

var js_ext = /\.js$/i;

['include', 'inject', 'load'].forEach(function (fn) {
    exports[fn] = function () {
        var instance = new Modularity();
        return instance[fn].apply(instance, arguments);
    };
});

exports.Modularity = Modularity;

function Modularity(options) {
    this.paths = [];
    options = options || (options = {});
    if (options.include_global !== false) {
        this.paths.push('');
    }
    this.cache = {};
}

util.inherits(Modularity, EventEmitter);

Modularity.prototype.include = function (/* dirs... */) {
    this.paths = Array.prototype.slice.call(arguments).concat(this.paths);
    return this;
};

Modularity.prototype.inject = function (modules) {
    for (var key in modules) {
        this.cache[key] = modules[key];
    }
    return this;
};

Modularity.prototype.load = function (callback) {
    var dependencies, self = this;
    if (Array.isArray(callback) && typeof callback[callback.length - 1] === 'function') {
        dependencies = callback;
        callback = callback[callback.length - 1];
    } else {
        dependencies = parseArgs(callback);
    }
    process.nextTick(function () {
        self.loadDependencies(dependencies, [], '(root)', function (err) {
            if (err) {
                return self.emit('error', err);
            }
            callback.apply(null, dependencies.map(function (dependency) {
                return self.cache[dependency];
            }));
        });
    });
    return this;
};

Modularity.prototype.loadDependencies = function (dependencies, ancestors, parent, callback) {
    var self = this;
    forEach(dependencies, function (dependency, next) {
        if (dependency === 'callback' || typeof dependency === 'function') {
            return next();
        }
        if (dependency in self.cache) {
            return next();
        }
        if (ancestors.indexOf(dependency) !== -1) {
            var message = 'Circular dependency for "%s" found in %s'
              , error = new Error(util.format(message, dependency, parent));
            return next(error);
        }
        self.require(parent, dependency, ancestors, next);
    }, callback);
};

Modularity.prototype.loadModule = function (dependency, ancestors, module, module_path, callback) {
    var module_deps, self = this;
    if (Array.isArray(module) && typeof module[module.length - 1] === 'function') {
        module_deps = module;
        module = module[module.length - 1];
    } else if (typeof module === 'function') {
        module_deps = parseArgs(module);
    } else {
        self.cache[dependency] = module;
        return callback();
    }
    var module_ancestors = ancestors.concat([ dependency ]);
    self.loadDependencies(module_deps, module_ancestors, module_path, function (err) {
        if (err) {
            return callback(err);
        }
        var is_async = module_deps.indexOf('callback') !== -1;
        if (is_async) {
            self.cache.callback = function (err, module) {
                self.cache[dependency] = module;
                callback(err);
            };
        }
        var args = module_deps.map(function (dependency) {
            return self.cache[dependency];
        });
        var sync_return = module.apply(null, args);
        if (!is_async) {
            self.cache[dependency] = sync_return;
            callback();
        }
    });
};

Modularity.prototype.require = function (parent, dependency, ancestors, callback) {
    var attempts = [], module, self = this;
    forEach(this.paths, function (module_path, next) {
        module_path = path.join(module_path, dependency);
        try {
            module = require(module_path);
            return self.loadModule(dependency, ancestors, module, module_path, callback);
        } catch (e) {
            if (typeof e !== 'object' ||
                    e.code !== 'MODULE_NOT_FOUND' ||
                    e.message.indexOf(module_path) === -1) {
                return callback(e);
            }
            attempts.push(module_path);
        }
        fs.stat(module_path, function (err, stat) {
            if (err) {
                if (err.code !== 'ENOENT') {
                    return callback(err);
                }
                return next();
            }
            if (!stat.isDirectory()) {
                return next();
            }
            var dir_ancestors = ancestors.concat([ dependency ]);
            fs.readdir(module_path, function (err, files) {
                if (err) {
                    return callback(err);
                }
                module = {};
                forEach(files, function (file, next) {
                    if (!js_ext.test(file)) {
                        return next();
                    }
                    file = file.replace(js_ext, '');
                    var cache_key = path.join(dependency, file)
                      , file_path = path.join(module_path, file)
                      , file_module = require(file_path);
                    self.loadModule(cache_key, dir_ancestors, file_module, file_path, function (err) {
                        if (err) {
                            return callback(err);
                        }
                        module[file] = self.cache[cache_key];
                        next();
                    });
                }, function () {
                    self.cache[dependency] = module;
                    return callback();
                });
            });
        });
    }, function () {
        var requires = attempts.map(function (module_path) {
            return util.format('require("%s")', module_path);
        }).join(', ');
        var message = 'Failed to locate dependency "%s" when loading %s, tried %s'
          , error = new Error(util.format(message, dependency, parent, requires));
        callback(error);
    });
};

function parseArgs(fn) {
    var arg_str = fn.toString().match(/function [^\(]*\(([^\)]*)\)/)[1];
    return arg_str.split(/[\r\t\n ]*,[\r\t\n ]*/).filter(function (arg) {
        return arg.length;
    });
}

function forEach(array, iterator, callback) {
    var remaining = array.length, pos = 0;
    if (!remaining) {
        return callback();
    }
    (function next() {
        iterator(array[pos++], function (err) {
            if (err || !--remaining) {
                return callback(err);
            }
            setImmediate(next);
        });
    })();
}

