// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var common = require('../common');
var execSync = require('child_process').execSync;
var assert = require('assert');

(function testEchoHello() {
  var hello = execSync('echo hello');
  assert.strictEqual(hello, 'hello\n');
})();

(function testExceptionIfExitCodeGreaterZero() {
  var caught;
  try {
    execSync('non-existing-command');
  } catch (err) {
    caught = err;
  }

  assert.equal(caught.exitCode, 127);
})();

(function testExceptionOnSignalKill() {
  var caught;
  try {
    execSync('kill -9 $$');
  } catch (err) {
    caught = err;
  }

  assert.equal(caught.signal, 'SIGTERM');
})();
