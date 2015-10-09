var fs =  require('fs');
var async = require('async');
var loopback = require('loopback');

function loadFixtures(models, callback) {
  console.log('load fixtures');
  var fixturePath = __dirname + '/../test-fixtures/';
  var fixtures = fs.readdirSync(fixturePath);

  function loadFixture(fixture, done){
    var fixtureName = fixture.replace('.json', '');
    var fixtureData = require(fixturePath + fixture);
    models[fixtureName].create(fixtureData, done);
  }

  async.each(fixtures, loadFixture, callback);
}

function setupTestFixtures(app) {

  loadFixtures(app.models, function(err){
    if (err) console.log(err);
  });

  var Test = app.model('test', {dataSource: 'db'});

  Test.setupFixtures = app.setupFixtures = function(options, callback){
    loadFixtures(app.models, callback);
  };

  Test.teardownFixtures = app.teardownFixtures = function(options, callback){
    console.log('teardown fixtures');
    var dataSourceNames = Object.keys(app.datasources);
    dataSourceNames.forEach(function(dataSourceName){
      app.datasources[dataSourceName].automigrate();
    });
    callback(null, 'teardown complete');
  };

  Test.remoteMethod('setupFixtures', {
    description: 'Setup fixtures for testing',
    http: {path: '/setup', verb: 'get'}
  });

  Test.remoteMethod('teardownFixtures', {
    description: 'Teardown test fixtures',
    http: {path: '/teardown', verb: 'get'}
  });

}

module.exports = (process.env.NODE_ENV === 'test')? setupTestFixtures: function(){};
