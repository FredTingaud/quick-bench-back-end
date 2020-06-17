const app = require('../src/libbuild');

var assert = require('assert');

describe('clean unwanted characters', function () {
    it('should keep words', function () {
        assert.equal(app.cleanFilename('cstdio'), 'cstdio');
    });
    it('should keep - and _', function () {
        assert.equal(app.cleanFilename('c_str-1'), 'c_str-1');
    });
    it('should not keep unwanted characters', function () {
        assert.equal(app.cleanFilename('c/test\t\nunwanted./**/$^%'), 'c_test__unwanted________');
    });
    it('should not keep emojis', function () {
        assert.equal(app.cleanFilename('😊'), '__');
    });
    it('should have a name', function () {
        assert.equal(app.cleanFilename(''), '_');
    });
});
