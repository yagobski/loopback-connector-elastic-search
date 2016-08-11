module.exports = {
  'db': {
    'name': 'elasticsearch-ssl',
    'connector': 'es',
    'index': 'shakespeare',
    'hosts': [
      {
        'protocol': 'https',
        'host': 'localhost',
        'port': 9243, // TODO: think about defaulting it to 9243+1=9244 for an example run against v1.x of ES
        'auth': 'username:password'
      }
    ],
    'apiVersion': '1.1',
    'log': 'trace',
    'defaultSize': 50,
    'requestTimeout': 30000,
    'ssl': {
      'ca': './../cacert.pem',
      'rejectUnauthorized': true
    },
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
