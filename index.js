var fs =  require('fs');
var async = require('async');
var loopback = require('loopback');
var merge = require('merge');

function loadFixtures(models, path, callback) {
  var fixturePath = process.cwd() + path;
  var fixtures = fs.readdirSync(fixturePath);

  function loadFixture(fixture, done){
    var fixtureName = fixture.replace('.json', '');
    var fixtureData = require(fixturePath + fixture);
    models[fixtureName].create(fixtureData, done);
  }

  async.each(fixtures, loadFixture, callback);
}

module.exports = function setupTestFixtures(app, options) {

  options = merge({
    loadFixturesOnStartup: false,
    environments: 'test',
    fixturePath: '/server/test-fixtures/'
  }, options);

  if (options.environments.indexOf(process.env.NODE_ENV) === -1) return;

  if (options.loadFixturesOnStartup){
    loadFixtures(app.models, options.fixturePath, function(err){
      if (err) console.log(err);
    });
  }

  var Fixtures = app.model('fixtures', {dataSource: 'db'});

  Fixtures.setupFixtures = app.setupFixtures = function(options, callback){
    loadFixtures(app.models, function(){
      callback(null, 'setup complete');
    });
  };

  Fixtures.teardownFixtures = app.teardownFixtures = function(options, callback){
    var dataSourceNames = Object.keys(app.datasources);
    dataSourceNames.forEach(function(dataSourceName){
      app.datasources[dataSourceName].automigrate();
    });
    callback(null, 'teardown complete');
  };

  Fixtures.remoteMethod('setupFixtures', {
    description: 'Setup fixtures',
    returns: {arg: 'fixtures', type: 'string'},
    http: {path: '/setup', verb: 'get'}
  });

  Fixtures.remoteMethod('teardownFixtures', {
    description: 'Teardown fixtures',
    returns: {arg: 'fixtures', type: 'string'},
    http: {path: '/teardown', verb: 'get'}
  });

};
