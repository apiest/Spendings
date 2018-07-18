const errors = require('restify-errors');
const bank = require('./helpers/bank');
const search = require('./helpers/settings/search.json');

/**
 * 
 * post /upload/csv/{type}
 * 
 *  name:type,
 *   in:path,
 *   description:The csv type like ING or Rabobank,
 *   required:true,
 *   type:
 *
 *  @param {Object} req
 *  @param {Object} res
 *  @param {Object} next
 */
exports.handler = function uploadCSV(req, res, next) {
    let config = {};
    let type = req.params.type;

    Promise.all([search,bank.getCategories()]).then(function(values) {
        config.search = values[0];
        config.categories = values[1];

        let bulk = [];
        for(let i=req.body.length - 1; i >= 0; i--) {
            let o = bank.save(req.body[i], type, config);
            bulk.push({'index': {'_id': o.id}});
            bulk.push(o.obj);
        };

        server.environment.client.bulk({
            index: 'bankstatements',
            type: 'bankrecord',
            refresh: 'wait_for',
            body: bulk
        }, function (err, resp) {
            if(!err) {
                res.json(201, {"code": 201, "message": req.body.length + " items added"});
                return next();
            } else {
                res.json(500, {"code": 500, "message": err});
                return next();
            }
        });
    }).catch(function(e){ console.log(e); });
};
