var fs =  require('fs');
var path = require('path');
var async = require('async');
var loopback = require('loopback');
var merge = require('merge');

var fixtures;
var cachedFixtures;

function loadFixtures(models, fixturesPath, callback) {
  function loadFixture(fixture, done){
    if (!cachedFixtures[fixture]) {
      var fixtureData = require(fixturePath + fixture);
      cachedFixtures[fixture] = fixtureData;
    }

    var fixtureName = fixture.replace('.json', '');
    models[fixtureName].create(cachedFixtures[fixture], done);
  }

  if (!cachedFixtures) {
    cachedFixtures = {}
    var fixturePath = path.join(process.cwd(), fixturesPath);
    var fixtureFolderContents = fs.readdirSync(fixturePath);
    fixtures = fixtureFolderContents.filter(function(fileName){
      return fileName.match(/\.json$/);
    });
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
      var dataSource = app.datasources[dataSourceName];

      if (Array.isArray(fixtures)) {
        // build modelNames and modelNamesLower as a bit of hack
        // to ensure we migrate the correct model name.
        // its not possible to figure out which is the correct
        // (lower or upper case) and automigrate doesn't do anything
        // if the case is incorrect.
        var modelNames = fixtures.map(function(fixture) {
          return fixture.replace('.json', '');
        });
        var modelNamesLower = modelNames.map(function(modelName) {
          return modelName.toLowerCase();
        });
        var modelNamesBothCases = modelNames.concat(modelNamesLower);

        var remigrateModel = function(model, done) {
          dataSource.automigrate(model, done);
        }
        async.each(modelNamesBothCases, remigrateModel, done);
      } else {
        dataSource.automigrate(done);
      }
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
