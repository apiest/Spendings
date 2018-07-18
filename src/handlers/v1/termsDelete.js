const errors = require('restify-errors');
const md5 = require('md5');

/**
 * 
 * post /terms/delete
 * 
 *  name:category,
 *   in:query,
 *   description:The Category of the term,
 *   required:true,
 *   type:
 *  name:term,
 *   in:query,
 *   description:The term to delete,
 *   required:true,
 *   type:
 *
 *  @param {Object} req
 *  @param {Object} res
 *  @param {Object} next
 */
exports.handler = function termsDelete(req, res, next) {
    let category = req.query.category;
    let term = req.query.term;

    let id = (category + ':' + term).toLowerCase();

    server.environment.client.delete({
        index: 'bankcategories',
        type: 'categories',
        refresh: 'wait_for',
        id: md5(id)
    }, function (err, resp) {
        if(err) {
            res.json(500, {"code": 500, "message": err});
            return next();
        } else {
            res.json(202, {"code": 202, "message": "deleted"});
            return next();
        }
    });
};
