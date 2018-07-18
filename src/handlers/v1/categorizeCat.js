const errors = require('restify-errors');
const search = require('./helpers/settings/search.json');
const bank = require('./helpers/bank');

/**
 * 
 * get /categorize
 * 
 *  name:category,
 *   in:query,
 *   description:The Category to re-categorize,
 *   required:,
 *   type:
 *
 *  @param {Object} req
 *  @param {Object} res
 *  @param {Object} next
 */
exports.handler = async function categorizeCat(req, res, next) {
    let category = req.query.category;
    let config = {};
    config.search = search;
    config.categories = await bank.getCategories();

    let s = await server.environment.client.search({
        index: 'bankstatements',
        size: 10000,
        type: 'bankrecord',
        q: 'category:empty'
    });
    let bulk = [];
    for(let i = s.hits.hits.length-1; i>=0; i--) {
        let obj = s.hits.hits[i]._source.original;
        let type = s.hits.hits[i]._source.bank;

        let o = bank.save(obj, type, config);
        if(o.obj.category != 'empty') {
            bulk.push({'index': {'_id': o.id}});
            bulk.push(o.obj);
        }
    }
    if(bulk.length > 0) {
        server.environment.client.bulk({
            index: 'bankstatements',
            type: 'bankrecord',
            refresh: 'true',
            body: bulk
        }, function (err, resp) {
            if (!err) {
                res.json(200, {
                    "code": 200,
                    "message": "Rerunning category " + category + ", " + bulk.length / 2 + " items recategorized"
                });
                return next();
            } else {
                res.json(500, {"code": 500, "message": err});
                return next();
            }
        });
    } else {
        res.json(200, {
            "code": 200,
            "message": "Rerunning category " + category + ", " + bulk.length / 2 + " items recategorized"
        });
        return next();
    }
};
