### v1.1.0 - Sep 25, 2016
- Fixed Issue #52
  - Multi Index usage
    - any model specific indices or mappings should be setup when the connector is initialized
    - mappings array in datasource.<env>.json may contain the index and type properties, which will be used to setup that model's index and mappings during connector initialization

### v1.0.8 - Sep 21, 2016
- Fixed Issue #51

### v1.0.7 - Aug 11, 2016
- Fixed Issue #45
