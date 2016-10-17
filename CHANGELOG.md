### v1.2.0 - Sep 25, 2016
- Add eslint infrastructure
  - `npm install --save-dev eslint@2.13.1`
    - ESLint v3.0.0 now requires Node.js 4 or higher. If you still need ESLint to run on Node.js < 4, then we recommend staying with ESLint v2.13.1 until you are ready to upgrade your Node.js version.
  - https://github.com/strongloop/loopback-contributor-docs/blob/master/eslint-guide.md
  - https://github.com/strongloop/eslint-config-loopback

### v1.1.0 - Sep 25, 2016
- Fixed Issue #52
  - Multi Index usage
    - any model specific indices or mappings should be setup when the connector is initialized
    - mappings array in datasource.<env>.json may contain the index and type properties, which will be used to setup that model's index and mappings during connector initialization

### v1.0.8 - Sep 21, 2016
- Fixed Issue #51

### v1.0.7 - Aug 11, 2016
- Fixed Issue #45
