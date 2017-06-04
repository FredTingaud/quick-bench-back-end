const app = require('../app');
const sha1 = require('sha1');

var assert = require('assert');

const refId = '630d398cbd8e8c9d76bd3fb17ede3b77abe4302e';
const refUrl = 'Yw05jL2OjJ12vT_xft47d6vkMC4';

describe('default-encoded', function () {
    it('should return a stable result', function () {
        assert.equal(app.encodeName(refId), refUrl);
    });
})

describe('default-decoded', function () {
    it('should return a stable result', function () {
        assert.equal(app.decodeName(refUrl), refId);
    });
})

describe('bijective', function () {
    it('should be bijective', function () {
        const name = sha1('Hello World!');
        assert.equal(app.decodeName(app.encodeName(name)), name);
    });
})

describe('URL safe', function () {
    it('should give URL safe names', function () {
        [...Array(10).keys()].map((val) => app.encodeName(sha1(val))).forEach((val) => assert.equal(val, encodeURIComponent(val)));
    });
})
