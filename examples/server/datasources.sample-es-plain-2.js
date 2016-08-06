module.exports = {
  'db': {
    'name': 'elasticsearch-plain',
    'connector': 'es',
    'index': 'shakespeare',
    'hosts': [
      {
        'host': 'localhost',
        'port': 9202
      }
    ],
    'apiVersion': '2.3',
    'log': 'trace',
    'defaultSize': 50,
    'requestTimeout': 30000,
    'mappings': [
      {
        'name': 'UserModel',
        'properties': {
          'id': {'type': 'string', 'index' : 'not_analyzed' },
          'realm': {'type': 'string', 'index' : 'not_analyzed' },
          'username': {'type': 'string', 'index' : 'not_analyzed' },
          'password': {'type': 'string', 'index' : 'not_analyzed' },
          'email': {'type': 'string', 'index' : 'not_analyzed' }
        }
      }
    ]
  }
};
