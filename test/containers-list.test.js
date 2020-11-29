const app = require('../src/docker');

var assert = require('assert');



describe('list containers list', function () {
    it('should support empty list', function () {
        assert.deepEqual(app.readContainersList(''), []);
    });
    it('should parse one value', function () {
        assert.deepEqual(app.readContainersList('clang-10.1'), ['clang-10.1']);
    });
    it('should order by decreasing version', function () {
        assert.deepEqual(app.readContainersList('clang-10.1\nclang-8.1\nclang-9.0'), ['clang-10.1', 'clang-9.0', 'clang-8.1']);
    });
    it('should sort clang first and gcc next', function () {
        assert.deepEqual(app.readContainersList('clang-10.1\ngcc-9.1\nclang-9.0\ngcc-12.7'), ['clang-10.1', 'clang-9.0', 'gcc-12.7', 'gcc-9.1']);
    });
});
