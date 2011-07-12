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

var binding = process.binding('evals');

exports.Script = binding.NodeScript;
exports.createScript = function(code, ctx, name) {
  return new exports.Script(code, ctx, name);
};

[
  'createContext',
  'runInContext',
  'runInThisContext',
  'runInNewContext'
].forEach(function(method) {
  exports[method] = function() {
    try {
      return binding.NodeScript[method].apply(null, arguments);
    } catch (err) {
      // v8 does not supply the full stack on Script::Compile() errors.
      // This hack fixes it bettert than the previous hack did.
      if (err.filename) {
        var stack = err.stack.split('\n');
        var line = '    at ' + err.filename + ':' + err.line + ':' + err.startColumn;
        stack.splice(1, 0, line);
        err.stack = stack.join('\n');
      }

      throw err;
    }
  };
});
