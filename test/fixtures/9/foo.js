module.exports = ['bar/baz', 'bar/baz_foo', 'bar/baz/qux', function (baz, foo, qux) {
    return baz + foo + qux.join('');
}];

