const errors = require('restify-errors');

/**
 * 
 * get /status
 * 
 *
 *  @param {Object} req
 *  @param {Object} res
 *  @param {Object} next
 */
exports.handler = function serviceStatus(req, res, next) {
    server.environment.client.ping({
        requestTimeout: 30000,
    }, function (error) {
        if (error) {
            res.json(500, {"code": 500, "message": "Elastic is Down"});
            return next();
        } else {
            res.json(200, {"code": 200, "message": "Elastic is OK"});
            return next();
        }
    });
};
