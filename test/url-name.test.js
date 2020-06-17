const tools = require('../src/tools');
const sha1 = require('sha1');

var assert = require('assert');

const refId = '630d398cbd8e8c9d76bd3fb17ede3b77abe4302e';
const refUrl = 'Yw05jL2OjJ12vT_xft47d6vkMC4';
const twoSlashes = 'hbkmjh-0uSQKrYlQ-qNjLpgDEto';
const twoSlashedId = '85b9268e1ff4b9240aad8950fea3632e980312da';
const twoPluses = 'hbkmjh_0uSQKrYlQ_qNjLpgDEto';
const twoPlusesId = '85b9268e1fb4b9240aad8950faa3632e980312da';

describe('default codes', function () {
    it('should return a stable encoding', function () {
        assert.equal(tools.encodeName(refId), refUrl);
    });
    it('should return a stable decoding', function () {
        assert.equal(tools.decodeName(refUrl), refId);
    });
})

describe('bijective', function () {
    it('should be bijective', function () {
        const name = sha1('Hello World!');
        assert.equal(tools.decodeName(tools.encodeName(name)), name);
    });
})

describe('URL safe', function () {
    it('should give URL safe names', function () {
        [...Array(10).keys()].map((val) => tools.encodeName(sha1(val))).forEach((val) => assert.equal(val, encodeURIComponent(val)));
    });
    it('should escape multiple slashes', function () {
        assert.equal(tools.decodeName(twoSlashes), twoSlashedId);
        assert.equal(tools.encodeName(twoSlashedId), twoSlashes);
    })
    it('should escape multiple plusses', function () {
        assert.equal(tools.decodeName(twoPluses), twoPlusesId);
        assert.equal(tools.encodeName(twoPlusesId), twoPluses);
    })
})
