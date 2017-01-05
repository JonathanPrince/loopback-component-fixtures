/* global describe, beforeEach, it */
'use strict'
const request = require('supertest')
const expect = require('chai').expect
let fixturesComponent
let loopback
let app
let Item
let Item2

// Forces a module to load from disk, preventing state from
// carrying over from test to test
function requireUncached (module) {
  delete require.cache[require.resolve(module)]
  return require(module)
}

describe('loopback fixtures component', function () {
  beforeEach(function () {
    // Force a 'clean' loopback and fixtures component for each test
    // Without this, the fixturesPath setting bleeds from test to test
    fixturesComponent = requireUncached('../')
    loopback = requireUncached('loopback')

    app = loopback()
    app.set('legacyExplorer', false)

    const dataSource = app.dataSource('db', {
      name: 'db',
      connector: 'memory'
    })

    Item = dataSource.createModel('Item', {
      id: {type: Number, id: true},
      requiredStuff: {type: String, required: true},
      name: String,
      description: String
    })
    Item2 = dataSource.createModel('Item2', {
      id: {type: Number, id: true},
      requiredStuff: {type: String, required: true},
      name: String,
      description: String
    })

    app.model(Item)
    app.model(Item2)
    app.use(loopback.rest())
  })

  describe('when using defaults', function () {
    it('shouldn\'t load fixtures on startup ', function (done) {
      const options = {}

      fixturesComponent(app, options)

      request(app).get('/items')
        .expect(200)
        .end(function (err, res) {
          expect(err).to.be.null
          expect(res.body).to.be.an('Array')
          expect(res.body.length).to.equal(0)
          done()
        })
    })
  })

  describe('setting loadFixturesOnStartup: true', function () {
    it('should load fixtures on startup ', function (done) {
      const options = {
        'loadFixturesOnStartup': true,
        'fixturesPath': 'test/test-fixtures/'
      }

      fixturesComponent(app, options)

      request(app).get('/items')
        .expect(200)
        .end(function (err, res) {
          expect(err).to.be.null
          expect(res.body).to.be.an('Array')
          expect(res.body.length).to.equal(2)
          done()
        })
    })

    it('shouldn\'t load in start fixtures because of wrong environment', function (done) {
      app.settings.env = 'env'

      const options = {
        'loadFixturesOnStartup': true,
        'fixturesPath': 'test/test-fixtures/',
        'environments': 'wrong_env'
      }

      fixturesComponent(app, options)

      request(app).get('/items')
        .expect(200)
        .end(function (err, res) {
          expect(err).to.be.null
          expect(res.body).to.be.an('Array')
          expect(res.body.length).to.equal(0)
          done()
        })
    })

    it('should load in start fixtures because of env matches', function (done) {
      app.settings.env = 'env'

      const options = {
        'loadFixturesOnStartup': true,
        'fixturesPath': 'test/test-fixtures/',
        'environments': 'env'
      }

      fixturesComponent(app, options)

      request(app).get('/items')
        .expect(200)
        .end(function (err, res) {
          expect(err).to.be.null
          expect(res.body).to.be.an('Array')
          expect(res.body.length).to.equal(2)
          done()
        })
    })

    it('should load in start fixtures because no app env setting is set', function (done) {
      delete app.settings.env

      const options = {
        'loadFixturesOnStartup': true,
        'fixturesPath': 'test/test-fixtures/',
        'environments': process.env.NODE_ENV
      }

      fixturesComponent(app, options)

      request(app).get('/items')
        .expect(200)
        .end(function (err, res) {
          expect(err).to.be.null
          expect(res.body).to.be.an('Array')
          expect(res.body.length).to.equal(2)
          done()
        })
    })

    it('should load in start fixtures because no app env setting is set (as array)', function (done) {
      delete app.settings.env

      const options = {
        'loadFixturesOnStartup': true,
        'fixturesPath': 'test/test-fixtures/',
        'environments': [process.env.NODE_ENV]
      }

      fixturesComponent(app, options)

      request(app).get('/items')
        .expect(200)
        .end(function (err, res) {
          expect(err).to.be.null
          expect(res.body).to.be.an('Array')
          expect(res.body.length).to.equal(2)
          done()
        })
    })

    it('should load in start fixtures because of env matches (as array)', function (done) {
      app.settings.env = 'env'

      const options = {
        'loadFixturesOnStartup': true,
        'fixturesPath': 'test/test-fixtures/',
        'environments': ['env']
      }

      fixturesComponent(app, options)

      request(app).get('/items')
        .expect(200)
        .end(function (err, res) {
          expect(err).to.be.null
          expect(res.body).to.be.an('Array')
          expect(res.body.length).to.equal(2)
          done()
        })
    })

    it('should not throw an error if fixtures fail to load on startup', function () {
      const options = {
        'loadFixturesOnStartup': true,
        'fixturesPath': 'test/test-fixtures-invalid/'
      }
      expect(fixturesComponent.bind(this, app, options)).to.not.throw()
    })

    it('should throw an error if fixtures fail to load on startup and errors are enabled', function () {
      const options = {
        'loadFixturesOnStartup': true,
        'errorOnSetupFailure': true,
        'fixturesPath': 'test/test-fixtures-invalid/'
      }
      expect(fixturesComponent.bind(this, app, options)).to.throw()
    })

    // it('shouldn\'t load files without .json extension', function (done) {
    //   const options = {
    //     'loadFixturesOnStartup': true,
    //     'fixturesPath': 'test/test-fixtures/'
    //   }
    //
    //   fixturesComponent(app, options)
    //
    //   request(app).get('/DontLoadThis')
    //     .expect(404)
    //     .end(function (err, res) {
    //       expect(err).to.be.null
    //       done()
    //     })
    // })
  })

  describe('fixtures methods', function () {
    describe('app.setupFixtures', function () {
      it('should setup fixtures when called', function (done) {
        const options = {
          'loadFixturesOnStartup': false,
          'fixturesPath': 'test/test-fixtures/'
        }

        fixturesComponent(app, options)

        app.setupFixtures(function () {
          request(app).get('/items')
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res.body.length).to.equal(2)
              done()
            })
        })
      })

      it('should be possible to specify which fixtures to load', function (done) {
        const options = {
          'loadFixturesOnStartup': false,
          'fixturesPath': 'test/test-fixtures/'
        }

        fixturesComponent(app, options)

        app.setupFixtures('Item2', function () {
          request(app).get('/items')
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res.body.length).to.equal(0)
              request(app).get('/item2s')
                .expect(200)
                .end(function (err, res) {
                  expect(err).to.be.null
                  expect(res.body.length).to.equal(2)
                  done()
                })
            })
        })
      })
    })

    describe('app.teardownFixtures', function () {
      it('should teardown fixtures when called', function (done) {
        const options = {
          'loadFixturesOnStartup': true,
          'fixturesPath': 'test/test-fixtures/'
        }

        fixturesComponent(app, options)

        app.teardownFixtures(function () {
          request(app).get('/items')
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res.body.length).to.equal(0)
              done()
            })
        })
      })

      it('should be possible to specify which fixtures to teardown', function (done) {
        const options = {
          'loadFixturesOnStartup': true,
          'fixturesPath': 'test/test-fixtures/'
        }

        fixturesComponent(app, options)

        app.teardownFixtures('Item2', function () {
          request(app).get('/items')
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res.body.length).to.equal(2)
              request(app).get('/item2s')
                .expect(200)
                .end(function (err, res) {
                  expect(err).to.be.null
                  expect(res.body.length).to.equal(0)
                  done()
                })
            })
        })
      })
    })
  })

  describe('fixtures endpoints', function () {
    describe('a GET request to /fixtures/setup with invalid fixtures', function () {
      it('should return OK message when when errors are not enabled', function (done) {
        const options = {
          'fixturesPath': 'test/test-fixtures-invalid/',
          'errorOnSetupFailure': false
        }

        fixturesComponent(app, options)

        request(app).get('/fixtures/setup')
          .expect(200)
          .end(function (err, res) {
            expect(err).to.be.null
            done()
          })
      })

      it('should return failure message when when errors are enabled', function (done) {
        const options = {
          'fixturesPath': 'test/test-fixtures-invalid/',
          'errorOnSetupFailure': true
        }

        fixturesComponent(app, options)

        request(app).get('/fixtures/setup')
          .expect(500)
          .end(function (err, res) {
            expect(err).to.be.null
            expect(res.body).to.be.an('Object')
            expect(res.body.error).to.exist
            done()
          })
      })

      it('should not load fixtures', function (done) {
        const options = {
          'fixturesPath': 'test/test-fixtures-invalid/'
        }

        fixturesComponent(app, options)

        request(app).get('/fixtures/setup').end(function () {
          request(app).get('/items')
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res.body).to.be.an('Array')
              expect(res.body.length).to.equal(0)
              done()
            })
        })
      })
    })

    describe('a GET request to /fixtures/setup with valid fixtures', function () {
      it('should return success message', function (done) {
        const options = {
          'fixturesPath': 'test/test-fixtures/'
        }

        fixturesComponent(app, options)

        request(app).get('/fixtures/setup')
          .expect(200)
          .end(function (err, res) {
            expect(err).to.be.null
            expect(res.body).to.be.an('Object')
            expect(res.body).to.deep.equal({'fixtures': 'setup complete'})
            done()
          })
      })

      it('should load fixtures', function (done) {
        const options = {
          'fixturesPath': 'test/test-fixtures/'
        }

        fixturesComponent(app, options)

        request(app).get('/fixtures/setup').end(function () {
          request(app).get('/items')
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res.body).to.be.an('Array')
              expect(res.body.length).to.equal(2)
              done()
            })
        })
      })

      it('should load selected fixture', function (done) {
        const options = {
          'fixturesPath': 'test/test-fixtures/'
        }

        fixturesComponent(app, options)

        request(app).get('/fixtures/setup?opts=Item2').end(function () {
          request(app).get('/items')
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res.body.length).to.equal(0)
              request(app).get('/item2s')
                .expect(200)
                .end(function (err, res) {
                  expect(err).to.be.null
                  expect(res.body.length).to.equal(2)
                  done()
                })
            })
        })
      })

      it('should load a selection of fixtures', function (done) {
        const options = {
          'fixturesPath': 'test/test-fixtures/'
        }

        fixturesComponent(app, options)

        request(app).get('/fixtures/setup?opts=Item2,Item').end(function () {
          request(app).get('/items')
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res.body.length).to.equal(2)
              request(app).get('/item2s')
                .expect(200)
                .end(function (err, res) {
                  expect(err).to.be.null
                  expect(res.body.length).to.equal(2)
                  done()
                })
            })
        })
      })
    })

    describe('a GET request to /fixtures/teardown', function () {
      it('should return success message', function (done) {
        const options = {
          'fixturesPath': 'test/test-fixtures/'
        }

        fixturesComponent(app, options)

        request(app).get('/fixtures/teardown')
          .expect(200)
          .end(function (err, res) {
            expect(err).to.be.null
            expect(res.body).to.be.an('Object')
            expect(res.body).to.deep.equal({'fixtures': 'teardown complete'})
            done()
          })
      })

      it('should teardown fixtures', function (done) {
        const options = {
          'loadFixturesOnStartup': true,
          'fixturesPath': 'test/test-fixtures/'
        }

        fixturesComponent(app, options)

        request(app).get('/fixtures/teardown')
          .end(function (err, res) {
            expect(err).to.be.null
            app.models.Item.find(function (err, data) {
              expect(err).to.not.exist
              expect(data.length).to.equal(0)
              done()
            })
          })
      })

      it('should teardown a selected fixture', function (done) {
        const options = {
          'loadFixturesOnStartup': true,
          'fixturesPath': 'test/test-fixtures/'
        }

        fixturesComponent(app, options)

        request(app).get('/fixtures/teardown?opts=Item2').end(function () {
          request(app).get('/items')
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res.body.length).to.equal(2)
              request(app).get('/item2s')
                .expect(200)
                .end(function (err, res) {
                  expect(err).to.be.null
                  expect(res.body.length).to.equal(0)
                  done()
                })
            })
        })
      })

      it('should teardwon a selection of fixtures', function (done) {
        const options = {
          'loadFixturesOnStartup': true,
          'fixturesPath': 'test/test-fixtures/'
        }

        fixturesComponent(app, options)

        request(app).get('/fixtures/teardown?opts=Item2,Item').end(function () {
          request(app).get('/items')
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res.body.length).to.equal(0)
              request(app).get('/item2s')
                .expect(200)
                .end(function (err, res) {
                  expect(err).to.be.null
                  expect(res.body.length).to.equal(0)
                  done()
                })
            })
        })
      })

      it('should teardown fixtures even when none were setup', function (done) {
        const options = {
          'loadFixturesOnStartup': false,
          'fixturesPath': 'test/test-fixtures/'
        }

        fixturesComponent(app, options)

        request(app).get('/fixtures/teardown')
          .end(function (err, res) {
            expect(err).to.be.null
            app.models.Item.find(function (err, data) {
              expect(err).to.not.exist
              expect(data.length).to.equal(0)
              done()
            })
          })
      })
    })
  })
})
