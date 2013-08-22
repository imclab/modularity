var path = require('path')
  , join = path.join
  , sep = path.sep
  , modularity = exports;

['include', 'inject', 'load'].forEach(function (fn) {
    modularity[fn] = function () {
        var instance = new Modularity();
        return instance[fn].apply(instance, arguments);
    };
});

function Modularity() {
    this.paths = [
        '' //i.e. include global modules
    ];
    this.cache = {};
}

modularity.Modularity = Modularity;

Modularity.prototype.include = function (dirs) {
    dirs = Array.prototype.slice.call(arguments);
    this.paths = dirs.concat(this.paths);
    return this;
};

Modularity.prototype.inject = function (modules) {
    for (var key in modules) {
        this.cache[key] = modules[key];
    }
    return this;
};

Modularity.prototype.load = function (callback) {
    var paths = Array.prototype.slice.call(arguments);
    callback = paths.pop();
    var dependencies = args(callback)
      , expects_error = dependencies.indexOf('err') !== -1;
    dependencies = expects_error ? dependencies.slice(1) : dependencies;
    this.loadDependencies(dependencies, [], null, function (err, modules) {
        if (err) {
            if (expects_error) {
                return callback(err);
            } else {
                throw err;
            }
        }
        var args = dependencies.map(function (dependency) {
            return modules[dependency];
        });
        if (expects_error) {
            args = [ null ].concat(args);
        }
        callback.apply(null, args);
    });
};

Modularity.prototype.loadDependencies = function (dependencies, ancestors, parent, callback) {
    var loaded = {}, self = this;
    forEach(dependencies, function (dependency, next) {
        if (!dependency || dependency === 'callback') {
            return next();
        }
        if (dependency in self.cache) {
            loaded[dependency] = self.cache[dependency];
            return next();
        }
        if (ancestors.indexOf(dependency) !== -1) {
            return next(new Error('Circular dependency for "' + dependency +
                '" found in module "' + parent + '"'));
        }
        process.nextTick(function () {
            self.require(parent, dependency, function (err, module, path) {
                if (err) {
                    return next(err);
                }
                if (typeof module !== 'function') {
                    loaded[dependency] = self.cache[dependency] = module;
                    return next();
                }
                var module_dependencies = args(module);
                self.loadDependencies(module_dependencies, ancestors.concat([dependency]), path, function (err, modules) {
                    if (err) {
                        return next(err);
                    }
                    var is_async = module_dependencies.indexOf('callback') !== -1;
                    if (is_async) {
                        modules.callback = function (err, module) {
                            loaded[dependency] = self.cache[dependency] = module;
                            next(err);
                        };
                    }
                    var args = module_dependencies.map(function (dependency) {
                        return modules[dependency];
                    });
                    var sync_return = module.apply(null, args);
                    if (!is_async) {
                        loaded[dependency] = self.cache[dependency] = sync_return;
                        next();
                    }
                });
            });
        });
    }, function (err) {
        callback(err, loaded);
    });
};

Modularity.prototype.require = function (parent, dependency, callback) {
    var attempts = [];
    for (var path, module, i = 0, len = this.paths.length; i < len; i++) {
        path = join(this.paths[i] || '', dependency);
        try {
            module = require(path);
            return callback(null, module, path);
        } catch (e) {
            if (typeof e !== 'object' || !e.message ||
                    e.code !== 'MODULE_NOT_FOUND' ||
                    e.message.indexOf(path) === -1) {
                return callback(e);
            }
            attempts.push(path);
        }
        if (dependency.indexOf('_') !== -1) {
            path = join(this.paths[i] || '', dependency.replace(/_/g, sep));
            try {
                module = require(path);
                return callback(null, module, path);
            } catch (e) {
                if (typeof e !== 'object' || !e.message ||
                        e.code !== 'MODULE_NOT_FOUND' ||
                        e.message.indexOf(path) === -1) {
                    return callback(e);
                }
                attempts.push(path);
            }
        }
    }
    var attempted_paths = attempts.map(function (path) {
        return 'require(\'' + path + '\')';
    }).join(', ');
    var message = 'Failed to locate dependency "' + dependency + '"';
    if (parent) {
        message += ' when loading module "' + parent + '"';
    }
    message += ', tried ' + attempted_paths;
    callback(new Error(message));
};

function args(fn) {
    return fn.toString()
             .match(/function [^\(]*\(([^\)]*)\)/)[1]
             .split(/[\r\t\n ]*,[\r\t\n ]*/);
}

function forEach(array, each, callback) {
    var remaining = array.length, pos = 0;
    if (!remaining) {
        return callback();
    }
    (function next() {
        each(array[pos++], function (err) {
            if (err || !--remaining) {
                return callback(err);
            }
            process.nextTick(next);
        });
    })();
}

