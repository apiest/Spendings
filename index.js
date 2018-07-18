const restify = require('restify');
const bunyan = require('bunyan');
const swaggerRoutes = require('swagger-routes');
let logger = bunyan.createLogger({name: 'Bank Statements API', level: 'debug'});
let environment = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';
let enableCodeGenerator = false;
let port = process.env.PORT || '3000'; // Default port must be 3000
const elasticsearch = require('elasticsearch');

/**
 * Initiate server as restify instance
 */
server = restify.createServer({
    name: 'Bank Statements APIs',
    log: logger,
});

/**
 * load configuration files
 * and add config to be reused
 */
server.environment = require('./src/config/'+environment+'.json');
server.environment.environment = environment;

/**
 * Restify plugins
 */
server.use(restify.plugins.bodyParser({
    mapParams: false,
}));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.requestLogger());
server.use(restify.plugins.gzipResponse());

// development settings
if (environment === 'development') {
    enableCodeGenerator = true;
}

/**
 * Map restify routes to the swagger API specification
 * https://github.com/mikestead/swagger-routes
 */
swaggerRoutes(server, {
    api: './definitions/openapi.json',
    handlers: {
        path: './src/handlers/v1',
        template: './definitions/template/handler.mustache', // can also be set with a loaded template
        getTemplateView: (operation) => operation, // define the object to be rendered by your template
        generate: enableCodeGenerator, // handler file generation on by default
        group: false, // when true each handler file will be placed under a directory named after its primary tag
    },
    authorizers: './src/security/v1',
});

server.pre(function(req, res, next) {
    if (environment == 'development') {
        /**
         * log requests to console
         */
        console.log('server.pre for', req.url);
    }
    return next();
});

/**
 * Log every handled response triggered by calling next()
 * after the response is sent back
 */
server.on('after', restify.plugins.auditLogger({event: 'after', log: logger}));

server.on('InternalServer', function(req, res, err, cb) {
    err.body = 'Something is wrong!';
    return cb();
});

server.on('BadRequest', function(req, res, err, cb) {
    err.body = 'Validation error!';
    return cb();
});

server.environment.client = new elasticsearch.Client({
    host: ['elasticsearch:9200'],
    requestTimeout : 120000
//    , log: 'trace'
});

server.environment.client.indices.create({
    "index": "bankcategories",
    "body": {
        "settings": {
            "index": {
                "number_of_shards": 1,
                "number_of_replicas": 1
            }
        },
        "mappings": {
            "categories":{
                "properties": {
                    "category" : {
                        "type": "keyword"
                    },
                    "term" : {
                        "type": "keyword"
                    }
                }
            }
        }
    }
}, function (err, response) {
    if(!err || (err && err.status == 400)) {
        server.environment.client.indices.create({
            "index": "bankstatements",
            "body": {
                "settings": {
                    "index": {
                        "number_of_shards": 2,
                    }
                },
                "mappings": {
                    "bankrecord": {
                        "properties": {
                            "@timestamp": {
                                "type":   "date",
                                "format": "epoch_millis"
                            },
                            "name": {
                                "type": "text",
                                "term_vector": "with_positions_offsets",
                                "store" : true
                            },
                            "comments": {
                                "type": "text",
                                "term_vector": "with_positions_offsets",
                                "store" : true
                            }
                        }
                    }
                }
            }
        }, async function (err, response) {
            if (!err || (err && err.status == 400)) {

                let count = await server.environment.client.count({index: 'bankcategories'});

                if(count.count == 0) {
                    const categories = require('./definitions/categories.json');
                    const md5 = require('md5');
                    let keys = Object.keys(categories);
                    let values = Object.values(categories);
                    let bulk = [];

                    for(let i = keys.length - 1; i>=0; i--) {
                        for(let j = values[i].length - 1; j>=0; j--) {
                            bulk.push({'index': {'_id': md5((keys[i] + ':' + values[i][j]).toLowerCase())}});
                            bulk.push({category: keys[i], term: values[i][j]});
                        }
                    }

                    server.environment.client.bulk({
                        index: 'bankcategories',
                        type: 'categories',
                        refresh: 'wait_for',
                        body: bulk
                    }, function (err, resp) {
                        console.log(err);
                        console.log(resp);
                    });
                }

                /**
                 * Start server on port
                 */
                server.listen(port, () => {
                    logger.info('API services are running on', port, 'in', environment, 'mode');
                });
            } else {
                logger.error(err);
                process.exit();
            }
        });
    } else {
        logger.error(err);
        process.exit();
    }
});

module.exports = server;