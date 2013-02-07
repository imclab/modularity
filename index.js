var join = require('path').join
  , modularity = exports;

modularity.includeExternalModules = true;

modularity.load = function (/* paths, */ callback) {
    var paths = Array.prototype.slice.call(arguments)
      , components = {};
    callback = paths.pop();
    var dependencies = modularity.args(callback)
      , expects_error = dependencies.indexOf('err') !== -1;
    dependencies = expects_error ? dependencies.slice(1) : dependencies;
    if (modularity.includeExternalModules) {
        paths.push('');
    }
    modularity.loadDependencies(dependencies, paths, function (err, modules) {
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

modularity.loadDependencies = function (dependencies, paths, ancestors, parent, cache, callback) {
    if (typeof ancestors === 'function') {
        callback = ancestors;
        ancestors = [];
        parent = null;
        cache = {};
    }
    var loaded = {};
    modularity.forEach(dependencies, function (dependency, next) {
        if (dependency === 'callback') {
            return next();
        }
        if (dependency in cache) {
            loaded[dependency] = cache[dependency];
            return next();
        }
        if (ancestors.indexOf(dependency) !== -1) {
            return next(new Error('Circular dependency for "' + dependency +
                '" found in module "' + parent +'"'));
        }
        modularity.require(parent, dependency, paths, function (err, module, path) {
            if (err) {
                return next(err);
            }
            if (typeof module !== 'function') {
                loaded[dependency] = cache[dependency] = module;
                return next();
            }
            var module_dependencies = modularity.args(module);
            modularity.loadDependencies(module_dependencies, paths,
                    ancestors.concat([dependency]), path, cache, function (err, modules) {
                if (err) {
                    return next(err);
                }
                var is_async = module_dependencies.indexOf('callback') !== -1;
                if (is_async) {
                    modules.callback = function (err, module) {
                        loaded[dependency] = cache[dependency] = module;
                        next(err);
                    };
                }
                var args = module_dependencies.map(function (dependency) {
                    return modules[dependency];
                });
                var sync_return = module.apply(null, args);
                if (!is_async) {
                    loaded[dependency] = cache[dependency] = sync_return;
                    next();
                }
            });
        });
    }, function (err) {
        callback(err, loaded);
    });
};

modularity.require = function (parent, dependency, paths, callback) {
    process.nextTick(function () {
        var attempts = [];
        for (var path, module, i = 0, len = paths.length; i < len; i++) {
            path = join(paths[i], dependency);
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
        paths = attempts.map(function (path) {
            return 'require(\'' + path + '\')';
        }).join(', ');
        var message = 'Failed to locate dependency "' + dependency + '"';
        if (parent) {
            message += ' when loading module "' + parent + '"';
        }
        message += ', tried ' + paths;
        callback(new Error(message));
    });
};

modularity.args = function (fn) {
    return fn.toString()
             .match(/function [^\(]*\(([^\)]*)\)/)[1]
             .split(/[\r\t\n ]*,[\r\t\n ]*/);
};

modularity.forEach = function (array, each, callback) {
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
};

