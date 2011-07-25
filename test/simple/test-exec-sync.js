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

function execFixtureSync(script) {
  var cmd = [process.execPath, common.fixturesDir + '/' + script]
    .concat(Array.prototype.slice.call(arguments, 1))
    .join(' ');

  return execSync(cmd);
}

(function testEchoHello() {
  var exec = execFixtureSync('echo.js');
  assert.strictEqual(exec.output, 'hello world\r\n');
  assert.equal(exec.signal, '');
  assert.equal(exec.code, 0);
})();

(function testExitCode() {
  var exec = execFixtureSync('exit.js', 2);
  assert.equal(exec.code, 2);
})();

(function testExitSignal() {
  var exec = execFixtureSync('signal.js', 'SIGKILL');
  assert.equal(exec.signal, 'SIGKILL');
  assert.strictEqual(exec.code, null);
})();
