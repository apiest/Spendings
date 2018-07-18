const errors = require('restify-errors');
const md5 = require('md5');

/**
 * 
 * post /terms/add
 * 
 *  name:category,
 *   in:query,
 *   description:The Category to add the term,
 *   required:true,
 *   type:
 *  name:term,
 *   in:query,
 *   description:The term to add the category,
 *   required:true,
 *   type:
 *
 *  @param {Object} req
 *  @param {Object} res
 *  @param {Object} next
 */
exports.handler = function termsAdd(req, res, next) {
    let category = req.query.category;
    let term = req.query.term;

    let id = (category + ':' + term).toLowerCase();

    server.environment.client.index({
        index: 'bankcategories',
        type: 'categories',
        refresh: 'wait_for',
        id: md5(id),
        body: {
            category: category,
            term: term
        }
    }, function (err, resp) {
        if(err) {
            res.json(500, {"code": 500, "message": err});
            return next();
        } else {
            res.json(201, {"code": 201, "message": "added"});
            return next();
        }
    });
};
