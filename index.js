'use strict'

const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path').path
const async = require('async')
const merge = require('merge')
const DebugGenerator = require('debug')
const debug = DebugGenerator('loopback:component:fixtures:')
const debugSetup = DebugGenerator('loopback:component:fixtures:setup:verbose:')
const debugTeardown = DebugGenerator('loopback:component:fixtures:teardown:verbose:')

let models
let fixtureNames
let fixturePath
let cachedFixtures

const loadFixture = (fixtureName, done) => {
  debugSetup('Loading fixture', fixtureName)

  if (!cachedFixtures[fixtureName]) {
    debugSetup('Fixture not cached loading from disk')
    const fixtureData = require(fixturePath + fixtureName)
    cachedFixtures[fixtureName] = fixtureData
  }

  debugSetup('Loading fixtures for', fixtureName)
  models[fixtureName].create(cachedFixtures[fixtureName], (err) => {
    if (err) {
      debugSetup('Error when attempting to add fixtures for', fixtureName)
      debugSetup(err)
    }

    done(err)
  })
}

const loadFixtures = (fixturesPath, fixtures, cb) => {
  if (!cachedFixtures) {
    debugSetup('No cached fixtures loading fixture files from', fixturePath)
    cachedFixtures = {}
    fixturePath = path.join(appRoot, fixturesPath)
    const fixtureFolderContents = fs.readdirSync(fixturePath)
    fixtureNames = fixtureFolderContents
      .filter(fileName => fileName.match(/\.json$/))
      .map(fileName => fileName.replace('.json', ''))
  }

  if (!cb) {
    cb = fixtures
    async.each(fixtureNames, loadFixture, cb)
  } else {
    async.each(fixtures, loadFixture, cb)
  }
}

const setupTestFixtures = (app, options) => {
  options = merge({
    loadFixturesOnStartup: false,
    errorOnSetupFailure: false,
    environments: 'test',
    fixturesPath: '/server/test-fixtures/'
  }, options)

  debug('Loading fixtures with options', options)

  models = app.models

  const environment = app.settings && app.settings.env
    ? app.settings.env : process.env.NODE_ENV

  const match = Array.isArray(options.environments)
    ? options.environments.indexOf(environment) !== -1
    : environment === options.environments

  if (!match) {
    debug('Skipping fixtures because environment', environment, 'is not in options.environments')
    return
  }

  if (options.loadFixturesOnStartup) {
    loadFixtures(options.fixturesPath, (err) => {
      if (err) debug('Error when loading fixtures on startup:', err)
      if (err && options.errorOnSetupFailure) {
        throw new Error('Failed to load fixtures on startup:', err)
      }
    })
  }

  const Fixtures = app.registry.createModel({name: 'Fixtures', base: 'Model'})

  app.model(Fixtures, {
    dataSource: false,
    base: 'Model'
  })

  Fixtures.setupFixtures = app.setupFixtures = (opts, cb) => {
    debug('Loading fixtures')
    const setupCallback = (errors) => {
      if (errors) debug('Fixtures failed to load:', errors)
      if (errors && options.errorOnSetupFailure) return cb(errors)

      cb(null, 'setup complete')
    }
    if (!cb) {
      cb = opts
      debugSetup('Loading all fixtures in folder')
      loadFixtures(options.fixturesPath, setupCallback)
    } else {
      if (!Array.isArray(opts)) opts = [opts]
      debugSetup('Loading following fixtures: ', opts)
      loadFixtures(options.fixturesPath, opts, setupCallback)
    }
  }

  Fixtures.teardownFixtures = app.teardownFixtures = (opts, cb) => {
    let fixturesToTeardown
    if (!cb) {
      cb = opts
      fixturesToTeardown = fixtureNames
    } else {
      if (!Array.isArray(opts)) opts = [opts]
      fixturesToTeardown = opts
    }
    debugTeardown('Tearing down fixtures for', Object.keys(app.datasources))
    const dataSourceNames = Object.keys(app.datasources)
    const migrateDataSource = (dataSourceName, done) => {
      debugTeardown('Tearing down fixtures for', dataSourceName)
      const dataSource = app.datasources[dataSourceName]

      if (Array.isArray(fixtureNames)) {
        // build modelNames and modelNamesLower as a bit of hack to ensure we
        // migrate the correct model name. its not possible to figure out
        // which is the correct (lower or upper case) and automigrate doesn't
        // do anything if the case is incorrect.
        const modelNamesLower = fixturesToTeardown.map(modelName => modelName.toLowerCase())
        const modelNamesBothCases = fixturesToTeardown.concat(modelNamesLower)
        const remigrateModel = (model, done) => {
          debugTeardown('Dropping model', model, 'from', dataSourceName)
          dataSource.automigrate(model, (err) => {
            if (err) {
              debugTeardown('Error when attempting to automigrate', model)
              debugTeardown(err)
            } else {
              debugTeardown('Successfully migrated', model)
            }
            done(err)
          })
        }

        async.each(modelNamesBothCases, remigrateModel, done)
      } else {
        debugTeardown('Dropping all models for', dataSourceName)
        dataSource.automigrate(() => {
          debugTeardown('Returning fixture teardown success (ignoring success/fail messages)')
          done()
        })
      }
    }

    debug('Tearing down data sources:', dataSourceNames)
    async.each(dataSourceNames, migrateDataSource, (errors) => {
      if (errors) {
        debug('Failed to tear down fixtures:', errors)
        debug('Note that errors here does not necessarily mean the teardown')
        debug('itself failed you should look at your database to ensure that')
        debug('your collections/tables are now empty.')
      }
      debug('Returning fixture teardown success message')
      cb(null, 'teardown complete')
    })
  }

  Fixtures.remoteMethod('setupFixtures', {
    description: 'Setup fixtures',
    returns: {arg: 'fixtures', type: 'string'},
    http: {path: '/setup', verb: 'get'}
  })

  Fixtures.remoteMethod('teardownFixtures', {
    description: 'Teardown fixtures',
    returns: {arg: 'fixtures', type: 'string'},
    http: {path: '/teardown', verb: 'get'}
  })
}

module.exports = setupTestFixtures
