# Spendings
Insight in your spendings

Making use of Elasticsearch and Kibana, Spendings tries to categorize you bank statements.

# How to
run docker-compose up to fire up the stack, if elastic does not work there is probably a permission issue in the esdata folder (this one is mounted by docker)

then use: 
`curl -X POST "http://localhost:3000/upload/ING" -H "accept: application/json" -H "Content-Type: text/csv" --data-binary "@ING.csv"`

to import the bankstatements, which are downloaded from your bank in csv format. (Currently only ING format supported) 

Terms can be added by posting to `http://localhost:3000/terms/add?category=aaa&term=bbb`

ReCategorizing of a certain category can be done with visiting `http://localhost:3000/categorize?category=empty`

**Kibana**

use @timestamp as timestamp filter, bankstatements is index for the indexpattern

From here on you can create your own visualizations and dashboards