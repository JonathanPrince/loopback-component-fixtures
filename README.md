# loopback-component-fixtures
This component was conceived by the desire to test client side applications without needing to mock API requests. It doesn't make sense to mock an API when Loopback is already being used. Environment specific datasource configurations were already available, the only piece missing was an easy way to add and remove fixtures when required. Hopefully this component will be useful for others as well, if you have any suggestions to improve the usefulness of this component please let me know, or even better feel free to submit a pull request.

# Usage

**Installation**

1. Install in you loopback project:

  `npm install --save loopback-component-fixtures`

2. Create a component-config.json file in your server folder (if you don't already have one)

3. Configure options inside `component-config.json`. *(see configuration section)*

  ```json
  {
    "loopback-component-fixtures": {
      "{option}": "{value}"
    }
  }
  ```

4. Create a folder for storing test fixtures.

  The default location is `/server/test-fixtures`. This can be set in `component-config.json` (see below)

5. Create `datasources.{env}.json` file. This is the datasources definition that will be used depending on the value of NODE_ENV where you want to use fixture data. Example:
  ```json
  {
    "db": {
      "name": "db",
      "connector": "memory"
    }
  }
  ```

**Configuration**

Options:

 - `loadFixturesOnStartup`

  [Boolean] : Defines whether the fixture data should be loaded on startup. *(default: false)*

 - `environments`

  [String/Array] : The name(s) of the environment(s) where the fixtures should be used. *(default: 'test')*

 - `fixturesPath`

  [String] : The location of of the fixture definitions relative to the project root. *(default: '/server/test-fixtures/')*

 - `datasource`

  [String] : The name of the datasource specified in `datasources.{env}.json` *(default: 'db')*

**Fixture Files**

Fixtures are stored in .json files and should have the same name as the loopback model definitions they correspond to. The content should be either an object (for a single item) or an array of objects for multiple items.

**Setup/Teardown Fixtures**

Fixtures can be setup at startup by setting `loadFixturesOnStartup` to `true` in the component-config file. The fixtures can be setup manually by making a GET request to the endpoint `<api-root>/fixtures/setup` and a GET request to `<api-root>/fixtures/teardown` will clear all data.

These actions are also available on the server as `app.setupFixtures(callback)` and `app.teardownFixtures(callback)`.
