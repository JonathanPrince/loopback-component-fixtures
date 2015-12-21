var fs =  require('fs');
var path = require('path');
var async = require('async');
var loopback = require('loopback');
var merge = require('merge');

function loadFixtures(models, fixturesPath, callback) {
  var fixturePath = path.join(process.cwd(), fixturesPath);
  var fixtureFolderContents = fs.readdirSync(fixturePath);
  var fixtures = fixtureFolderContents.filter(function(fileName){
    return fileName.match(/\.json$/);
  });

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
    fixturesPath: '/server/test-fixtures/'
  }, options);

  var environment = app.settings && app.settings.env
    ? app.settings.env : process.env.NODE_ENV;

  var match = Array.isArray(options.environments)
    ? options.environments.indexOf(environment) !== -1
    : environment === options.environments;

  if (!match) {
    return;
  }

  if (options.loadFixturesOnStartup){
    loadFixtures(app.models, options.fixturesPath, function(err){
      if (err) console.log(err);
    });
  }

  var Fixtures = app.model('fixtures', {
    dataSource: false,
    base: 'Model'
  });

  Fixtures.setupFixtures = app.setupFixtures = function(opts, callback){
    if (!callback) callback = opts;
    loadFixtures(app.models, options.fixturesPath, function(){
      callback(null, 'setup complete');
    });
  };

  Fixtures.teardownFixtures = app.teardownFixtures = function(opts, callback){
    if (!callback) callback = opts;
    var dataSourceNames = Object.keys(app.datasources);
    var migrateDataSource = function(dataSourceName, done){
      app.datasources[dataSourceName].automigrate(function(){
        done();
      });
    };
    async.each(dataSourceNames, migrateDataSource, function(){
      callback(null, 'teardown complete');
    });
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
