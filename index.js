var fs =  require('fs');
var path = require('path');
var async = require('async');
var loopback = require('loopback');
var merge = require('merge');
var fixtures;
var cachedFixtures;

var DebugGenerator = require('debug');
var debug = DebugGenerator('loopback:component:fixtures:');
var debugSetup = DebugGenerator('loopback:component:fixtures:setup:verbose:');
var debugTeardown = DebugGenerator('loopback:component:fixtures:teardown:verbose:');

function loadFixtures(models, fixturesPath, callback) {
  function loadFixture(fixture, done){
    debugSetup('Loading fixture', fixture);

    if (!cachedFixtures[fixture]) {
      debugSetup('Fixture not cached; loading from disk');
      var fixtureData = require(fixturePath + fixture);
      cachedFixtures[fixture] = fixtureData;
    }

    var fixtureName = fixture.replace('.json', '');
    debugSetup('Loading fixtures for', fixtureName);
    models[fixtureName].create(cachedFixtures[fixture], function(err) {
      if (err) {
        debugSetup('Error when attempting to add fixtures for', fixture);
        debugSetup(err);
      }

      done(err);
    });
  }

  if (!cachedFixtures) {
    debugSetup('No cached fixtures; loading fixture files from', fixturePath);
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
    errorOnSetupFailure: false,
    environments: 'test',
    fixturesPath: '/server/test-fixtures/'
  }, options);

  debug('Loading fixtures with options', options);

  var environment = app.settings && app.settings.env
    ? app.settings.env : process.env.NODE_ENV;

  var match = Array.isArray(options.environments)
    ? options.environments.indexOf(environment) !== -1
    : environment === options.environments;

  if (!match) {
    debug('Skipping fixtures because environment', environment, 'is not in options.environments');
    return;
  }

  if (options.loadFixturesOnStartup){
    loadFixtures(app.models, options.fixturesPath, function(err){
      if (err) {
        debug('Error when loading fixtures on startup:', err);
      }
      if (err && options.errorOnSetupFailure) {
        throw new Error('Failed to load fixtures on startup:', err);
      }
    });
  }

  var Fixtures = app.model('Fixtures', {
    dataSource: false,
    base: 'Model'
  });

  Fixtures.setupFixtures = app.setupFixtures = function(opts, callback){
    /* istanbul ignore else */
    if (!callback) callback = opts;
    debug('Loading fixtures');
    loadFixtures(app.models, options.fixturesPath, function(errors){
      if (errors) {
        debug('Fixtures failed to load:', errors);
      }
      if (errors && options.errorOnSetupFailure) {
        return callback(errors);
      }
      callback(null, 'setup complete');
    });
  };

  Fixtures.teardownFixtures = app.teardownFixtures = function(opts, callback){
    /* istanbul ignore else */
    if (!callback) callback = opts;
    debugTeardown('Tearing down fixtures for', Object.keys(app.datasources));
    var dataSourceNames = Object.keys(app.datasources);

    var migrateDataSource = function(dataSourceName, done){
      debugTeardown('Tearing down fixtures for', dataSourceName);
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
          debugTeardown('Dropping model', model, 'from', dataSourceName);
          dataSource.automigrate(model, function(err) {
            if (err) {
              debugTeardown('Error when attempting to automigrate', model);
              debugTeardown(err);
            } else {
              debugTeardown('Successfully migrated', model);
            }
            done(err);
          });
        }

        async.each(modelNamesBothCases, remigrateModel, done);
      } else {
        debugTeardown('Dropping all models for', dataSourceName);
        dataSource.automigrate(function() {
          debugTeardown('Returning fixture teardown success (ignoring success/fail messages)');
          done();
        });
      }
    };

    debug('Tearing down data sources:', dataSourceNames)
    async.each(dataSourceNames, migrateDataSource, function(errors){
      if (errors) {
        debug('Failed to tear down fixtures:', errors);
        debug('Note that errors here does not necessarily mean the teardown');
        debug('itself failed; you should look at your database to ensure that');
        debug('your collections/tables are now empty.');
      }
      debug('Returning fixture teardown success message');
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
