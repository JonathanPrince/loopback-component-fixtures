# loopback-component-fixtures
handle fixtures for testing clients against

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

5. Create `datasources.{env}.json` file. This is the datasources definition that will be used depending on the value of NODE_ENV wher you want to use fixture data. Example:
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

  [String] : The location of of the fixture definitions. *(default: '/server/test-fixtures/')*

 - `datasource`

  [String] : The name of the datasource specified in `datasources.{env}.json` *(default: 'db')*

**Fixture Files**

Fixtures are stored in .json files and should have the same name as the loopback model definitions they correspond to. The content should be either an object (for a single item) or an array of objects for multiple items.
