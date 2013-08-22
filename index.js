var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , path = require('path');

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
    var dependencies = parseArgs(callback)
      , self = this;
    process.nextTick(function () {
        self.loadDependencies(dependencies, [], '(root)', function (err, modules) {
            if (err) {
                return self.emit('error', err);
            }
            callback.apply(null, dependencies.map(function (dependency) {
                return modules[dependency];
            }));
        });
    });
    return this;
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
            var message = 'Circular dependency for "%s" found in %s'
              , error = new Error(util.format(message, dependency, parent));
            return next(error);
        }
        self.require(parent, dependency, function (err, module, module_path) {
            if (err) {
                return next(err);
            }
            if (typeof module !== 'function') {
                loaded[dependency] = self.cache[dependency] = module;
                return next();
            }
            var module_deps = parseArgs(module)
              , module_ancestors = ancestors.concat([ dependency ]);
            self.loadDependencies(module_deps, module_ancestors,
                    module_path, function (err, modules) {
                if (err) {
                    return next(err);
                }
                var is_async = module_deps.indexOf('callback') !== -1;
                if (is_async) {
                    modules.callback = function (err, module) {
                        loaded[dependency] = self.cache[dependency] = module;
                        next(err);
                    };
                }
                var args = module_deps.map(function (dependency) {
                    return modules[dependency];
                });
                var sync_return = module.apply(null, args);
                if (!is_async) {
                    loaded[dependency] = self.cache[dependency] = sync_return;
                    next();
                }
            });
        });
    }, function (err) {
        callback(err, loaded);
    });
};

Modularity.prototype.require = function (parent, dependency, callback) {
    var attempts = [], require_path, module, module_path, module_name;
    for (var i = 0, len = this.paths.length; i < len; i++) {
        module_name = dependency;
        require_path = this.paths[i];
        do {
            module_path = path.join(require_path, module_name);
            try {
                module = require(module_path);
                return callback(null, module, module_path);
            } catch (e) {
                if (typeof e !== 'object' ||
                        e.code !== 'MODULE_NOT_FOUND' ||
                        e.message.indexOf(module_path) === -1) {
                    return callback(e);
                }
                attempts.push(module_path);
            }
        } while (module_name !== (module_name = module_name.replace('_', path.sep)));
    }
    var requires = attempts.map(function (module_path) {
        return util.format('require("%s")', module_path);
    }).join(', ');
    var message = 'Failed to locate dependency "%s" when loading %s, tried %s'
      , error = new Error(util.format(message, dependency, parent, requires));
    callback(error);
};

function parseArgs(fn) {
    var arg_str = fn.toString().match(/function [^\(]*\(([^\)]*)\)/)[1];
    return arg_str.split(/[\r\t\n ]*,[\r\t\n ]*/);
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

