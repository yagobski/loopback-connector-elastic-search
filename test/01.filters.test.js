/*global getSettings getDataSource expect*/
describe('Connector', function () {
    var testConnector;

    before(function () {
        require('./init.js');
        var settings = getSettings();
        settings.log = 'error';
        var datasource = getDataSource(settings);
        testConnector = datasource.connector;

        datasource.define('MockLoopbackModel', {
            // here we want to let elasticsearch auto-populate a field that will be mapped back to loopback as the `id`
            id: {type: String, generated: true, id: true}
        });
    });

    it('should configure defaults when building filters', function (done) {
        var modelName = 'MockLoopbackModel';
        var defaults = testConnector.addDefaults(modelName);

        expect(defaults.index).to.be.a('string').to.have.length.above(1).to.match(/^[a-z0-9.-_]+$/i);
        expect(defaults.type).to.be.a('string').to.have.length.above(1).to.match(/^[a-z0-9.-_]+$/i);

        done();
    });

    it('should build a query for the WHERE filter', function (done) {
        var criteria, size, offset, modelName, modelIdName;
        criteria = {
            'where': {
                'title': 'Futuro'
            }
        };
        size = 100;
        offset = 10;
        modelName = 'MockLoopbackModel';
        modelIdName = 'id';

        var filterCriteria = testConnector.buildFilter(modelName, modelIdName, criteria, size, offset);
        expect(filterCriteria).not.to.be.null;
        expect(filterCriteria).to.have.property('index')
            .that.is.a('string');
        expect(filterCriteria).to.have.property('type')
            .that.is.a('string')
            .that.equals(modelName);
        expect(filterCriteria).to.have.property('body')
            .that.is.an('object')
            .that.deep.equals({ // a. this is really 2 tests in one
                sort: [
                  // b. `_uid` is an auto-generated field that ElasticSearch populates for us
                  // when we want to let the backend/system/ES take care of id population
                  // so if we want to sort by id, without specifying/controlling our own id field,
                  // then ofcourse the sort must happen on `_uid`, this part of the test, validates that!
                  '_uid'
                ],
                query: { // c. here we are testing the bigger picture `should build a query for the WHERE filter`
                    bool: {
                        must: [
                            {
                                match: {
                                    title: 'Futuro'
                                }
                            }
                        ]
                    }
                }
            });
        expect(filterCriteria).to.have.property('size')
            .that.is.a('number');
        expect(filterCriteria).to.have.property('from')
            .that.is.a('number');

        done();
    });

    it('should use a NATIVE filter query as-is', function (done) {
        var criteria, size, offset, modelName, modelIdName;
        criteria = {
            'native': {
                query: {
                    bool: {
                        must: [
                            {
                                match: {
                                    title: 'Futuro'
                                }
                            }
                        ]
                    }
                }
            }
        };
        size = 100;
        offset = 10;
        modelName = 'MockLoopbackModel';
        modelIdName = 'id';

        var filterCriteria = testConnector.buildFilter(modelName, modelIdName, criteria, size, offset);
        expect(filterCriteria).not.to.be.null;
        expect(filterCriteria).to.have.property('index')
            .that.is.a('string');
        expect(filterCriteria).to.have.property('type')
            .that.is.a('string')
            .that.equals(modelName);
        expect(filterCriteria).to.have.property('body')
            .that.is.an('object')
            .that.deep.equals({
                query: {
                    bool: {
                        must: [
                            {
                                match: {
                                    title: 'Futuro'
                                }
                            }
                        ]
                    }
                }
            });
        expect(filterCriteria).to.have.property('size')
            .that.is.a('number');
        expect(filterCriteria).to.have.property('from')
            .that.is.a('number');

        done();
    });
});