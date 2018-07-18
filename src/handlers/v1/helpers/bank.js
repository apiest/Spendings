'use strict';
const md5 = require('md5');

let self = {
    save: function (old, type, config) {
        let obj = {};
        if(type.toLowerCase() == 'ing') {
            obj.amount = 1.0 * parseFloat(old['Bedrag (EUR)'].replace(',','.'))
            obj.name = old['Naam / Omschrijving'];
            obj.comments = old.Mededelingen;
            obj.transaction = old['Af Bij'];
            obj.mutation = old.MutatieSoort;

            switch(obj.transaction) {
                case 'Af': obj.transaction = 'out'; break;
                case 'Bij': obj.transaction = 'in'; break;
            }

            if(obj.name.slice(-14) == 'BETAALAUTOMAAT') {
                let date = [];
                date.push('20' + obj.name.slice(6, 8));
                date.push(obj.name.slice(3, 5));
                date.push(obj.name.slice(0, 2));

                obj.date = date.join('-');

                let match = obj.name.match(/([0-2]\d:[0-5]\d)/);
                if (match) {
                    obj["@timestamp"] = Date.parse(obj.date + ' ' + match[0]);
                } else {
                    obj["@timestamp"] = Date.parse(obj.date);
                }
            } else {
                let date =[];
                date.push(old.Datum.slice(0,4));
                date.push(old.Datum.slice(4,6));
                date.push(old.Datum.slice(-2));

                obj.date = date.join('-');

                obj["@timestamp"] = Date.parse(obj.date);
            }
        }
        obj.original = old;
        obj.bank = type;

        obj.category = self.getCategory(obj, config);

        return  {id: md5(obj.date + obj.amount + old.tegenrekening + obj.transaction + obj.comments), obj: obj};
    },

    getCategories: async function() {
        let s = await server.environment.client.search({
            index: 'bankcategories',
            type: 'categories',
            size: 0,
            body: {
                "aggs": {
                    "group_by_category": {
                        "terms": {
                            "field": "category",
                            "size": 100,
                            "order": {
                                "_term": "desc"
                            }
                        },
                        "aggs": {
                            "terms": {
                                "terms": {
                                    "field": "term",
                                    "size": 100,
                                    "order": {
                                        "_term": "desc"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        let c = {};
        for(let i=s.aggregations.group_by_category.buckets.length-1; i>=0; i--) {
            let cat = s.aggregations.group_by_category.buckets[i].key;
            let t = [];
            for(let j=s.aggregations.group_by_category.buckets[i].terms.buckets.length-1; j>=0; j--) {
                t.push(s.aggregations.group_by_category.buckets[i].terms.buckets[j].key);
            }
            c[cat]=t;
        }

        return c;
    },

    getCategoryCheck: function(config, json, category, key) {
        let check = config.categories[category].some(function (word) {
            return json[key].toLowerCase().indexOf(word.toLowerCase()) != -1;
        });

        return (check === true) ? category : null;
    },

    getCategory: function (json, config) {
        for (let key in config.search) {
            for (let categoryId in config.search[key]) {
                let category = config.search[key][categoryId];
                if (category.constructor !== Object) {
                    let check = config.categories[category].some(function (word) {
                        return json[key].toLowerCase().indexOf(word.toLowerCase()) != -1;
                    });

                    if (check) {
                        return category;
                    }
                } else {
                    if(category.value != undefined && json[key] == category.value) {
                        for (let key2 in category.search) {
                            for (let categoryId2 in category.search[key2]) {
                                let category2 = category.search[key2][categoryId2];
                                let check2 = config.categories[category2].some(function (word) {
                                    return json[key2].toLowerCase().indexOf(word.toLowerCase()) != -1;
                                });

                                if (check2) {
                                    return category2;
                                }
                            }
                        }
                    }
                    else if(category.endswith != undefined && json[key].toLowerCase().indexOf(category.endswith.toLowerCase()) != -1) {
                        for (let key2 in category.search) {
                            for (let categoryId2 in category.search[key2]) {
                                let category2 = category.search[key2][categoryId2];
                                let check2 = config.categories[category2].some(function (word) {
                                    return json[key2].toLowerCase().indexOf(word.toLowerCase()) != -1;
                                });

                                if (check2) {
                                    return category2;
                                }
                            }
                        }
                    }
                }
            }
        }
        return 'empty';
    }
}

module.exports = self;
