## Modularity

Asynchronous dependency injection is a pain in node.js - here's a solution.

## Example

*app.js* (entry point)

```javascript
var modularity = require('modularity');

//Load the server and config module from ./lib
modularity.load(__dirname + '/lib', function (server, config) {

    server.listen(config.port);
    console.log('Listening on %s', config.port);

});
```

*lib/server.js*

```javascript
module.exports = function (express, database, config) {

    var server = express();

    server.get('/useless_route', function (request, response) {
        database.query('SELECT 1', function (err, rows) {
            response.send(rows);
        });
    });

    return server;

};
```

*lib/database.js*

```javascript
module.exports = function (config, callback) {

    var connection = new SomeDatabaseConnection(config);

    //Simulate an asynchronous initialisation..
    process.nextTick(function () {
        callback(null, connection);
    });

}
```

*lib/config.js*

```javascript
module.exports = {
    port: 3000
};
```

## License (MIT)

Copyright (c) 2013 Sydney Stockholm <opensource@sydneystockholm.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

