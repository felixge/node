// Hello, and welcome to hacking node.js!
//
// This file is invoked by node::Load in src/node.cc, and responsible for
// bootstrapping the node.js core. Special caution is given to the performance
// of the startup process, so many dependencies are invoked lazily.
(function(process) {
  global = this;

  function Startup() {
    Startup.globalVariables();
    Startup.globalTimeouts();
    Startup.globalConsole();

    Startup.processAssert();
    Startup.processNextTick();
    Startup.processStdio();
    Startup.processKillAndExit();
    Startup.processSignalHandlers();

    Startup.removedMethods();

    Startup.resolveArgv0();
    Startup.run();
  }

  Startup.globalVariables = function() {
    global.process = process;
    global.global = global;
    global.GLOBAL = global;
    global.root = global;
    global.Buffer = NativeModule.require('buffer').Buffer;
  };

  Startup.globalTimeouts = function() {
    global.setTimeout = function() {
      var t = NativeModule.require('timers');
      return t.setTimeout.apply(this, arguments);
    };

    global.setInterval = function() {
      var t = NativeModule.require('timers');
      return t.setInterval.apply(this, arguments);
    };

    global.clearTimeout = function() {
      var t = NativeModule.require('timers');
      return t.clearTimeout.apply(this, arguments);
    };

    global.clearInterval = function() {
      var t = NativeModule.require('timers');
      return t.clearInterval.apply(this, arguments);
    };
  };

  Startup.globalConsole = function() {
    global.__defineGetter__('console', function() {
      return NativeModule.require('console');
    });
  };


  Startup._lazyConstants = null;

  Startup.lazyConstants = function() {
    if (!Startup._lazyConstants) {
      Startup._lazyConstants = process.binding('constants');
    }
    return Startup._lazyConstants;
  };

  Startup.processAssert = function() {
    process.assert = function(x, msg) {
      if (!x) {
        throw new Error(msg || 'assertion error');
      }
    };
  };

  Startup.processNextTick = function() {
    var nextTickQueue = [];

    process._tickCallback = function() {
      var l = nextTickQueue.length;
      if (l === 0) return;

      try {
        for (var i = 0; i < l; i++) {
          nextTickQueue[i]();
        }
      }
      catch (e) {
        nextTickQueue.splice(0, i + 1);
        if (i + 1 < l) {
          process._needTickCallback();
        }
        throw e; // process.nextTick error, or 'error' event on first tick
      }

      nextTickQueue.splice(0, l);
    };

    process.nextTick = function(callback) {
      nextTickQueue.push(callback);
      process._needTickCallback();
    };
  };

  Startup.processStdio = function() {
    var stdout, stdin;

    process.__defineGetter__('stdout', function() {
      if (stdout) return stdout;

      var binding = process.binding('stdio'),
          net = NativeModule.require('net'),
          fs = NativeModule.require('fs'),
          tty = NativeModule.require('tty'),
          fd = binding.stdoutFD;

      if (binding.isatty(fd)) {
        stdout = new tty.WriteStream(fd);
      } else if (binding.isStdoutBlocking()) {
        stdout = new fs.WriteStream(null, {fd: fd});
      } else {
        stdout = new net.Stream(fd);
        // FIXME Should probably have an option in net.Stream to create a
        // stream from an existing fd which is writable only. But for now
        // we'll just add this hack and set the `readable` member to false.
        // Test: ./node test/fixtures/echo.js < /etc/passwd
        stdout.readable = false;
      }

      return stdout;
    });

    process.__defineGetter__('stdin', function() {
      if (stdin) return stdin;

      var binding = process.binding('stdio'),
          net = NativeModule.require('net'),
          fs = NativeModule.require('fs'),
          tty = NativeModule.require('tty'),
          fd = binding.openStdin();

      if (binding.isatty(fd)) {
        stdin = new tty.ReadStream(fd);
      } else if (binding.isStdinBlocking()) {
        stdin = new fs.ReadStream(null, {fd: fd});
      } else {
        stdin = new net.Stream(fd);
        stdin.readable = true;
      }

      return stdin;
    });

    process.openStdin = function() {
      process.stdin.resume();
      return process.stdin;
    };
  };

  Startup.processKillAndExit = function() {
    process.exit = function(code) {
      process.emit('exit', code || 0);
      process.reallyExit(code || 0);
    };

    process.kill = function(pid, sig) {
      sig = sig || 'SIGTERM';

      if (!Startup.lazyConstants()[sig]) {
        throw new Error('Unknown signal: ' + sig);
      }

      process._kill(pid, Startup.lazyConstants()[sig]);
    };
  };

  Startup.processSignalHandlers = function() {
    // Load events module in order to access prototype elements on process like
    // process.addListener.
    var events = NativeModule.require('events');
    var signalWatchers = {};
    var addListener = process.addListener;
    var removeListener = process.removeListener;

    function isSignal(event) {
      return event.slice(0, 3) === 'SIG' && Startup.lazyConstants()[event];
    }

    // Wrap addListener for the special signal types
    process.on = process.addListener = function(type, listener) {
      var ret = addListener.apply(this, arguments);
      if (isSignal(type)) {
        if (!signalWatchers.hasOwnProperty(type)) {
          var b = process.binding('signal_watcher');
          var w = new b.SignalWatcher(Startup.lazyConstants()[type]);
          w.callback = function() { process.emit(type); };
          signalWatchers[type] = w;
          w.start();

        } else if (this.listeners(type).length === 1) {
          signalWatchers[event].start();
        }
      }

      return ret;
    };

    process.removeListener = function(type, listener) {
      var ret = removeListener.apply(this, arguments);
      if (isSignal(type)) {
        process.assert(signalWatchers.hasOwnProperty(type));

        if (this.listeners(type).length === 0) {
          signalWatchers[type].stop();
        }
      }

      return ret;
    };
  };

  Startup._removedProcessMethods = {
    'debug': 'process.debug() use console.error() instead',
    'error': 'process.error() use console.error() instead',
    'watchFile': 'process.watchFile() has moved to fs.watchFile()',
    'unwatchFile': 'process.unwatchFile() has moved to fs.unwatchFile()',
    'mixin': 'process.mixin() has been removed.',
    'createChildProcess': 'childProcess API has changed. See doc/api.txt.',
    'inherits': 'process.inherits() has moved to sys.inherits.',
    '_byteLength': 'process._byteLength() has moved to Buffer.byteLength',
  };

  Startup.removedMethods = function() {
    for (var method in Startup._removedProcessMethods) {
      var reason = Startup._removedProcessMethods[method];
      process[method] = Startup._removedMethod(reason);
    }
  };

  Startup._removedMethod = function(reason) {
    return function() {
      throw new Error(reason);
    };
  };

  Startup.resolveArgv0 = function() {
    var cwd = process.cwd();
    var isWindows = process.platform === 'win32';

    // Make process.argv[0] into a full path, but only touch argv[0] if it's
    // not a system $PATH lookup.
    // TODO: Make this work on Windows as well.  Note that "node" might
    // execute cwd\node.exe, or some %PATH%\node.exe on Windows,
    // and that every directory has its own cwd, so d:node.exe is valid.
    var argv0 = process.argv[0];
    if (!isWindows && argv0.indexOf('/') !== -1 && argv0.charAt(0) !== '/') {
      var path = NativeModule.require('path');
      process.argv[0] = path.join(cwd, process.argv[0]);
    }
  };

  Startup.run = function() {
    if (Startup.runThirdPartyMain()) {
      return;
    }

    if (Startup.runDebugger()) {
      return;
    }

    if (Startup.runScript()) {
      return;
    }

    if (Startup.runEval()) {
      return;
    }

    Startup.runRepl();
  };

  Startup.runThirdPartyMain = function() {
    // To allow people to extend Node in different ways, this hook allows
    // one to drop a file lib/_third_party_main.js into the build directory
    // which will be executed instead of Node's normal loading.
    if (!NativeModule.exists('_third_party_main')) {
      return;
    }

    process.nextTick(function() {
      NativeModule.require('_third_party_main');
    });
    return true;
  };

  Startup.runDebugger = function() {
    if (!(process.argv[1] == 'debug')) {
      return;
    }

    // Start the debugger agent
    var d = NativeModule.require('_debugger');
    d.start();
    return true;
  };

  Startup.runScript = function() {
    if (!process.argv[1]) {
      return;
    }

    // make process.argv[1] into a full path
    if (!(/^http:\/\//).exec(process.argv[1])) {
      var path = NativeModule.require('path');
      process.argv[1] = path.resolve(process.argv[1]);
    }

    var Module = NativeModule.require('module');

    // REMOVEME: nextTick should not be necessary. This hack to get
    // test/simple/test-exception-handler2.js working.
    process.nextTick(Module.runMain);

    return true;
  };

  Startup.runEval = function() {
    // -e, --eval
    if (!process._eval) {
      return;
    }

    var Module = NativeModule.require('module');

    var rv = new Module()._compile('return eval(process._eval)', 'eval');
    console.log(rv);
    return true;
  };

  Startup.runRepl = function() {
    var Module = NativeModule.require('module');
    // REPL
    Module.requireRepl().start();
  };


  // Below you find a minimal module system, which is used to load the node
  // core modules found in lib/*.js. All core modules are compiled into the
  // node binary, so they can be loaded faster.

  var Script = process.binding('evals').Script;
  var runInThisContext = Script.runInThisContext;

  function NativeModule(id) {
    this.filename = id + '.js';
    this.id = id;
    this.exports = {};
    this.loaded = false;
  }

  NativeModule._source = process.binding('natives');
  NativeModule._cache = {};

  NativeModule.require = function(id) {
    if (id == 'native_module') {
      return NativeModule;
    }

    var cached = NativeModule.getCached(id);
    if (cached) {
      return cached.exports;
    }

    if (!NativeModule.exists(id)) {
      throw new Error('No such native module ' + id);
    }

    var nativeModule = new NativeModule(id);

    nativeModule.compile();
    nativeModule.cache();

    return nativeModule.exports;
  };

  NativeModule.getCached = function(id) {
    return NativeModule._cache[id];
  }

  NativeModule.exists = function(id) {
    return (id in NativeModule._source);
  }

  NativeModule.getSource = function(id) {
    return NativeModule._source[id];
  }

  NativeModule.wrap = function(script) {
    return NativeModule.wrapper[0] + script + NativeModule.wrapper[1];
  };

  NativeModule.wrapper = [
    '(function (exports, require, module, __filename, __dirname) { ',
    '\n});'
  ];

  NativeModule.prototype.compile = function() {
    var source = NativeModule.getSource(this.id);
    source = NativeModule.wrap(source);

    var fn = runInThisContext(source, this.filename, true);
    fn(this.exports, NativeModule.require, this, this.filename);

    this.loaded = true;
  };

  NativeModule.prototype.cache = function() {
    NativeModule._cache[this.id] = this;
  };

  Startup();
});
