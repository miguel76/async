/**
 * NOTE:  We are in the process of migrating these tests to Mocha.  If you are
 * adding a new test, please create a new spec file in mocha_tests/
 */

require('babel-core/register');
var async = require('../lib');

if (!Function.prototype.bind) {
    Function.prototype.bind = function (thisArg) {
        var args = Array.prototype.slice.call(arguments, 1);
        var self = this;
        return function () {
            self.apply(thisArg, args.concat(Array.prototype.slice.call(arguments)));
        };
    };
}

function getFunctionsObject(call_order) {
    return {
        one: function(callback){
            setTimeout(function(){
                call_order.push(1);
                callback(null, 1);
            }, 125);
        },
        two: function(callback){
            setTimeout(function(){
                call_order.push(2);
                callback(null, 2);
            }, 200);
        },
        three: function(callback){
            setTimeout(function(){
                call_order.push(3);
                callback(null, 3,3);
            }, 50);
        }
    };
}

function isBrowser() {
    return (typeof process === "undefined") ||
        (process + "" !== "[object process]"); // browserify
}


exports['seq'] = function (test) {
    test.expect(5);
    var add2 = function (n, cb) {
        test.equal(n, 3);
        setTimeout(function () {
            cb(null, n + 2);
        }, 50);
    };
    var mul3 = function (n, cb) {
        test.equal(n, 5);
        setTimeout(function () {
            cb(null, n * 3);
        }, 15);
    };
    var add1 = function (n, cb) {
        test.equal(n, 15);
        setTimeout(function () {
            cb(null, n + 1);
        }, 100);
    };
    var add2mul3add1 = async.seq(add2, mul3, add1);
    add2mul3add1(3, function (err, result) {
        if (err) {
            return test.done(err);
        }
        test.ok(err === null, err + " passed instead of 'null'");
        test.equal(result, 16);
        test.done();
    });
};

exports['seq error'] = function (test) {
    test.expect(3);
    var testerr = new Error('test');

    var add2 = function (n, cb) {
        test.equal(n, 3);
        setTimeout(function () {
            cb(null, n + 2);
        }, 50);
    };
    var mul3 = function (n, cb) {
        test.equal(n, 5);
        setTimeout(function () {
            cb(testerr);
        }, 15);
    };
    var add1 = function (n, cb) {
        test.ok(false, 'add1 should not get called');
        setTimeout(function () {
            cb(null, n + 1);
        }, 100);
    };
    var add2mul3add1 = async.seq(add2, mul3, add1);
    add2mul3add1(3, function (err) {
        test.equal(err, testerr);
        test.done();
    });
};

exports['seq binding'] = function (test) {
    test.expect(4);
    var testcontext = {name: 'foo'};

    var add2 = function (n, cb) {
        test.equal(this, testcontext);
        setTimeout(function () {
            cb(null, n + 2);
        }, 50);
    };
    var mul3 = function (n, cb) {
        test.equal(this, testcontext);
        setTimeout(function () {
            cb(null, n * 3);
        }, 15);
    };
    var add2mul3 = async.seq(add2, mul3);
    add2mul3.call(testcontext, 3, function (err, result) {
        if (err) {
            return test.done(err);
        }
        test.equal(this, testcontext);
        test.equal(result, 15);
        test.done();
    });
};

exports['seq without callback'] = function (test) {
    test.expect(2);
    var testcontext = {name: 'foo'};

    var add2 = function (n, cb) {
        test.equal(this, testcontext);
        setTimeout(function () {
            cb(null, n + 2);
        }, 50);
    };
    var mul3 = function () {
        test.equal(this, testcontext);
        setTimeout(function () {
            test.done();
        }, 15);
    };
    var add2mul3 = async.seq(add2, mul3);
    add2mul3.call(testcontext, 3);
};


exports['parallel'] = function(test){
    var call_order = [];
    async.parallel([
        function(callback){
            setTimeout(function(){
                call_order.push(1);
                callback(null, 1);
            }, 50);
        },
        function(callback){
            setTimeout(function(){
                call_order.push(2);
                callback(null, 2);
            }, 100);
        },
        function(callback){
            setTimeout(function(){
                call_order.push(3);
                callback(null, 3,3);
            }, 25);
        }
    ],
    function(err, results){
        test.ok(err === null, err + " passed instead of 'null'");
        test.same(call_order, [3,1,2]);
        test.same(results, [1,2,[3,3]]);
        test.done();
    });
};

exports['parallel empty array'] = function(test){
    async.parallel([], function(err, results){
        test.ok(err === null, err + " passed instead of 'null'");
        test.same(results, []);
        test.done();
    });
};

exports['parallel error'] = function(test){
    async.parallel([
        function(callback){
            callback('error', 1);
        },
        function(callback){
            callback('error2', 2);
        }
    ],
    function(err){
        test.equals(err, 'error');
    });
    setTimeout(test.done, 100);
};

exports['parallel no callback'] = function(test){
    async.parallel([
        function(callback){callback();},
        function(callback){callback(); test.done();},
    ]);
};

exports['parallel object'] = function(test){
    var call_order = [];
    async.parallel(getFunctionsObject(call_order), function(err, results){
        test.equals(err, null);
        test.same(call_order, [3,1,2]);
        test.same(results, {
            one: 1,
            two: 2,
            three: [3,3]
        });
        test.done();
    });
};

// Issue 10 on github: https://github.com/caolan/async/issues#issue/10
exports['paralel falsy return values'] = function (test) {
    function taskFalse(callback) {
        async.nextTick(function() {
            callback(null, false);
        });
    }
    function taskUndefined(callback) {
        async.nextTick(function() {
            callback(null, undefined);
        });
    }
    function taskEmpty(callback) {
        async.nextTick(function() {
            callback(null);
        });
    }
    function taskNull(callback) {
        async.nextTick(function() {
            callback(null, null);
        });
    }
    async.parallel(
        [taskFalse, taskUndefined, taskEmpty, taskNull],
        function(err, results) {
            test.equal(results.length, 4);
            test.strictEqual(results[0], false);
            test.strictEqual(results[1], undefined);
            test.strictEqual(results[2], undefined);
            test.strictEqual(results[3], null);
            test.done();
        }
    );
};


exports['parallel limit'] = function(test){
    var call_order = [];
    async.parallelLimit([
        function(callback){
            setTimeout(function(){
                call_order.push(1);
                callback(null, 1);
            }, 50);
        },
        function(callback){
            setTimeout(function(){
                call_order.push(2);
                callback(null, 2);
            }, 100);
        },
        function(callback){
            setTimeout(function(){
                call_order.push(3);
                callback(null, 3,3);
            }, 25);
        }
    ],
    2,
    function(err, results){
        test.ok(err === null, err + " passed instead of 'null'");
        test.same(call_order, [1,3,2]);
        test.same(results, [1,2,[3,3]]);
        test.done();
    });
};

exports['parallel limit empty array'] = function(test){
    async.parallelLimit([], 2, function(err, results){
        test.ok(err === null, err + " passed instead of 'null'");
        test.same(results, []);
        test.done();
    });
};

exports['parallel limit error'] = function(test){
    async.parallelLimit([
        function(callback){
            callback('error', 1);
        },
        function(callback){
            callback('error2', 2);
        }
    ],
    1,
    function(err){
        test.equals(err, 'error');
    });
    setTimeout(test.done, 100);
};

exports['parallel limit no callback'] = function(test){
    async.parallelLimit([
        function(callback){callback();},
        function(callback){callback(); test.done();},
    ], 1);
};

exports['parallel limit object'] = function(test){
    var call_order = [];
    async.parallelLimit(getFunctionsObject(call_order), 2, function(err, results){
        test.equals(err, null);
        test.same(call_order, [1,3,2]);
        test.same(results, {
            one: 1,
            two: 2,
            three: [3,3]
        });
        test.done();
    });
};

exports['parallel call in another context'] = function(test) {
    if (isBrowser()) {
        // node only test
        test.done();
        return;
    }
    var vm = require('vm');
    var sandbox = {
        async: async,
        test: test
    };

    var fn = "(" + (function () {
        async.parallel([function (callback) {
            callback();
        }], function (err) {
            if (err) {
                return test.done(err);
            }
            test.done();
        });
    }).toString() + "())";

    vm.runInNewContext(fn, sandbox);
};

exports['parallel error with reflect'] = function(test){
    async.parallel([
        async.reflect(function(callback){
            callback('error', 1);
        }),
        async.reflect(function(callback){
            callback('error2', 2);
        }),
        async.reflect(function(callback){
            callback(null, 2);
        })
    ],
    function(err, results){
        test.ok(err === null, err + " passed instead of 'null'");
        test.same(results, [
            { error: 'error' },
            { error: 'error2' },
            { value: 2 }
        ]);
        test.done();
    });
};

exports['parallel does not continue replenishing after error'] = function (test) {
    var started = 0;
    var arr = [
        funcToCall,
        funcToCall,
        funcToCall,
        funcToCall,
        funcToCall,
        funcToCall,
        funcToCall,
        funcToCall,
        funcToCall,
    ];
    var delay = 10;
    var limit = 3;
    var maxTime = 10 * arr.length;
    function funcToCall(callback) {
        started ++;
        if (started === 3) {
            return callback(new Error ("Test Error"));
        }
        setTimeout(function(){
            callback();
        }, delay);
    }

    async.parallelLimit(arr, limit, function(){});

    setTimeout(function(){
        test.equal(started, 3);
        test.done();
    }, maxTime);
};


exports['series'] = {

    'series': function(test){
    var call_order = [];
    async.series([
        function(callback){
            setTimeout(function(){
                call_order.push(1);
                callback(null, 1);
            }, 25);
        },
        function(callback){
            setTimeout(function(){
                call_order.push(2);
                callback(null, 2);
            }, 50);
        },
        function(callback){
            setTimeout(function(){
                call_order.push(3);
                callback(null, 3,3);
            }, 15);
        }
    ],
    function(err, results){
        test.ok(err === null, err + " passed instead of 'null'");
        test.same(results, [1,2,[3,3]]);
        test.same(call_order, [1,2,3]);
        test.done();
    });
},

    'with reflect': function(test){
    var call_order = [];
    async.series([
        async.reflect(function(callback){
            setTimeout(function(){
                call_order.push(1);
                callback(null, 1);
            }, 25);
        }),
        async.reflect(function(callback){
            setTimeout(function(){
                call_order.push(2);
                callback(null, 2);
            }, 50);
        }),
        async.reflect(function(callback){
            setTimeout(function(){
                call_order.push(3);
                callback(null, 3,3);
            }, 15);
        })
    ],
    function(err, results){
        test.ok(err === null, err + " passed instead of 'null'");
        test.deepEqual(results, [
            { value: 1 },
            { value: 2 },
            { value: [3,3] }
        ]);
        test.same(call_order, [1,2,3]);
        test.done();
    });
},

    'empty array': function(test){
    async.series([], function(err, results){
        test.equals(err, null);
        test.same(results, []);
        test.done();
    });
},

    'error': function(test){
    test.expect(1);
    async.series([
        function(callback){
            callback('error', 1);
        },
        function(callback){
            test.ok(false, 'should not be called');
            callback('error2', 2);
        }
    ],
    function(err){
        test.equals(err, 'error');
    });
    setTimeout(test.done, 100);
},

    'error with reflect': function(test){
    test.expect(2);
    async.series([
        async.reflect(function(callback){
            callback('error', 1);
        }),
        async.reflect(function(callback){
            callback('error2', 2);
        }),
        async.reflect(function(callback){
            callback(null, 1);
        })
    ],
    function(err, results){
        test.ok(err === null, err + " passed instead of 'null'");
        test.deepEqual(results, [
            { error: 'error' },
            { error: 'error2' },
            { value: 1 }
        ]);
        test.done();
    });
},

    'no callback': function(test){
    async.series([
        function(callback){callback();},
        function(callback){callback(); test.done();},
    ]);
},

    'object': function(test){
    var call_order = [];
    async.series(getFunctionsObject(call_order), function(err, results){
        test.equals(err, null);
        test.same(results, {
            one: 1,
            two: 2,
            three: [3,3]
        });
        test.same(call_order, [1,2,3]);
        test.done();
    });
},

    'call in another context': function(test) {
    if (isBrowser()) {
        // node only test
        test.done();
        return;
    }
    var vm = require('vm');
    var sandbox = {
        async: async,
        test: test
    };

    var fn = "(" + (function () {
        async.series([function (callback) {
            callback();
        }], function (err) {
            if (err) {
                return test.done(err);
            }
            test.done();
        });
    }).toString() + "())";

    vm.runInNewContext(fn, sandbox);
},

    // Issue 10 on github: https://github.com/caolan/async/issues#issue/10
    'falsy return values': function (test) {
    function taskFalse(callback) {
        async.nextTick(function() {
            callback(null, false);
        });
    }
    function taskUndefined(callback) {
        async.nextTick(function() {
            callback(null, undefined);
        });
    }
    function taskEmpty(callback) {
        async.nextTick(function() {
            callback(null);
        });
    }
    function taskNull(callback) {
        async.nextTick(function() {
            callback(null, null);
        });
    }
    async.series(
        [taskFalse, taskUndefined, taskEmpty, taskNull],
        function(err, results) {
            test.equal(results.length, 4);
            test.strictEqual(results[0], false);
            test.strictEqual(results[1], undefined);
            test.strictEqual(results[2], undefined);
            test.strictEqual(results[3], null);
            test.done();
        }
    );
}

};


exports['iterator'] = function(test){
    var call_order = [];
    var iterator = async.iterator([
        function(){call_order.push(1);},
        function(arg1){
            test.equals(arg1, 'arg1');
            call_order.push(2);
        },
        function(arg1, arg2){
            test.equals(arg1, 'arg1');
            test.equals(arg2, 'arg2');
            call_order.push(3);
        }
    ]);
    iterator();
    test.same(call_order, [1]);
    var iterator2 = iterator();
    test.same(call_order, [1,1]);
    var iterator3 = iterator2('arg1');
    test.same(call_order, [1,1,2]);
    var iterator4 = iterator3('arg1', 'arg2');
    test.same(call_order, [1,1,2,3]);
    test.equals(iterator4, undefined);
    test.done();
};

exports['iterator empty array'] = function(test){
    var iterator = async.iterator([]);
    test.equals(iterator(), undefined);
    test.equals(iterator.next(), undefined);
    test.done();
};

exports['iterator.next'] = function(test){
    var call_order = [];
    var iterator = async.iterator([
        function(){call_order.push(1);},
        function(arg1){
            test.equals(arg1, 'arg1');
            call_order.push(2);
        },
        function(arg1, arg2){
            test.equals(arg1, 'arg1');
            test.equals(arg2, 'arg2');
            call_order.push(3);
        }
    ]);
    var fn = iterator.next();
    var iterator2 = fn('arg1');
    test.same(call_order, [2]);
    iterator2('arg1','arg2');
    test.same(call_order, [2,3]);
    test.equals(iterator2.next(), undefined);
    test.done();
};

exports['reduce'] = function(test){
    var call_order = [];
    async.reduce([1,2,3], 0, function(a, x, callback){
        call_order.push(x);
        callback(null, a + x);
    }, function(err, result){
        test.ok(err === null, err + " passed instead of 'null'");
        test.equals(result, 6);
        test.same(call_order, [1,2,3]);
        test.done();
    });
};

exports['reduce async with non-reference memo'] = function(test){
    async.reduce([1,3,2], 0, function(a, x, callback){
        setTimeout(function(){callback(null, a + x);}, Math.random()*100);
    }, function(err, result){
        test.equals(result, 6);
        test.done();
    });
};

exports['reduce error'] = function(test){
    test.expect(1);
    async.reduce([1,2,3], 0, function(a, x, callback){
        callback('error');
    }, function(err){
        test.equals(err, 'error');
    });
    setTimeout(test.done, 50);
};

exports['inject alias'] = function(test){
    test.equals(async.inject, async.reduce);
    test.done();
};

exports['foldl alias'] = function(test){
    test.equals(async.foldl, async.reduce);
    test.done();
};

exports['reduceRight'] = function(test){
    var call_order = [];
    var a = [1,2,3];
    async.reduceRight(a, 0, function(a, x, callback){
        call_order.push(x);
        callback(null, a + x);
    }, function(err, result){
        test.equals(result, 6);
        test.same(call_order, [3,2,1]);
        test.same(a, [1,2,3]);
        test.done();
    });
};

exports['foldr alias'] = function(test){
    test.equals(async.foldr, async.reduceRight);
    test.done();
};

exports['transform implictly determines memo if not provided'] = function(test){
    async.transform([1,2,3], function(memo, x, v, callback){
        memo.push(x + 1);
        callback();
    }, function(err, result){
        test.same(result, [2, 3, 4]);
        test.done();
    });
};

exports['transform async with object memo'] = function(test){
    test.expect(2);

    async.transform([1,3,2], {}, function(memo, v, k, callback){
        setTimeout(function() {
            memo[k] = v;
            callback();
        });
    }, function(err, result) {
        test.equals(err, null);
        test.same(result, {
            0: 1,
            1: 3,
            2: 2
        });
        test.done();
    });
};

exports['transform iterating object'] = function(test){
    test.expect(2);

    async.transform({a: 1, b: 3, c: 2}, function(memo, v, k, callback){
        setTimeout(function() {
            memo[k] = v + 1;
            callback();
        });
    }, function(err, result) {
        test.equals(err, null);
        test.same(result, {a: 2, b: 4, c: 3});
        test.done();
    });
};

exports['transform error'] = function(test){
    async.transform([1,2,3], function(a, v, k, callback){
        callback('error');
    }, function(err){
        test.equals(err, 'error');
        test.done();
    });
};

exports['sortBy'] = function(test){
    test.expect(2);

    async.sortBy([{a:1},{a:15},{a:6}], function(x, callback){
        setTimeout(function(){callback(null, x.a);}, 0);
    }, function(err, result){
        test.ok(err === null, err + " passed instead of 'null'");
        test.same(result, [{a:1},{a:6},{a:15}]);
        test.done();
    });
};

exports['sortBy inverted'] = function(test){
    test.expect(1);

    async.sortBy([{a:1},{a:15},{a:6}], function(x, callback){
        setTimeout(function(){callback(null, x.a*-1);}, 0);
    }, function(err, result){
        test.same(result, [{a:15},{a:6},{a:1}]);
        test.done();
    });
};

exports['sortBy error'] = function(test){
    test.expect(1);
    var error = new Error('asdas');
    async.sortBy([{a:1},{a:15},{a:6}], function(x, callback){
        async.setImmediate(function(){
            callback(error);
        });
    }, function(err){
        test.equal(err, error);
        test.done();
    });
};

exports['apply'] = function(test){
    test.expect(6);
    var fn = function(){
        test.same(Array.prototype.slice.call(arguments), [1,2,3,4]);
    };
    async.apply(fn, 1, 2, 3, 4)();
    async.apply(fn, 1, 2, 3)(4);
    async.apply(fn, 1, 2)(3, 4);
    async.apply(fn, 1)(2, 3, 4);
    async.apply(fn)(1, 2, 3, 4);
    test.equals(
        async.apply(function(name){return 'hello ' + name;}, 'world')(),
        'hello world'
    );
    test.done();
};


// generates tests for console functions such as async.log
var console_fn_tests = function(name){

    if (typeof console !== 'undefined') {
        exports[name] = function(test){
            test.expect(5);
            var fn = function(arg1, callback){
                test.equals(arg1, 'one');
                setTimeout(function(){callback(null, 'test');}, 0);
            };
            var fn_err = function(arg1, callback){
                test.equals(arg1, 'one');
                setTimeout(function(){callback('error');}, 0);
            };
            var _console_fn = console[name];
            var _error = console.error;
            console[name] = function(val){
                test.equals(val, 'test');
                test.equals(arguments.length, 1);
                console.error = function(val){
                    test.equals(val, 'error');
                    console[name] = _console_fn;
                    console.error = _error;
                    test.done();
                };
                async[name](fn_err, 'one');
            };
            async[name](fn, 'one');
        };

        exports[name + ' with multiple result params'] = function(test){
            test.expect(1);
            var fn = function(callback){callback(null,'one','two','three');};
            var _console_fn = console[name];
            var called_with = [];
            console[name] = function(x){
                called_with.push(x);
            };
            async[name](fn);
            test.same(called_with, ['one','two','three']);
            console[name] = _console_fn;
            test.done();
        };
    }

    // browser-only test
    exports[name + ' without console.' + name] = function(test){
        if (typeof window !== 'undefined') {
            var _console = window.console;
            window.console = undefined;
            var fn = function(callback){callback(null, 'val');};
            var fn_err = function(callback){callback('error');};
            async[name](fn);
            async[name](fn_err);
            window.console = _console;
        }
        test.done();
    };

};


exports['times'] = {

    'times': function(test) {
    test.expect(2);
    async.times(5, function(n, next) {
        next(null, n);
    }, function(err, results) {
        test.ok(err === null, err + " passed instead of 'null'");
        test.same(results, [0,1,2,3,4]);
        test.done();
    });
},

    'times 3': function(test){
    test.expect(1);
    var args = [];
    async.times(3, function(n, callback){
        setTimeout(function(){
            args.push(n);
            callback();
        }, n * 25);
    }, function(err){
        if (err) throw err;
        test.same(args, [0,1,2]);
        test.done();
    });
},

    'times 0': function(test){
    test.expect(1);
    async.times(0, function(n, callback){
        test.ok(false, 'iteratee should not be called');
        callback();
    }, function(err){
        if (err) throw err;
        test.ok(true, 'should call callback');
    });
    setTimeout(test.done, 25);
},

    'times error': function(test){
    test.expect(1);
    async.times(3, function(n, callback){
        callback('error');
    }, function(err){
        test.equals(err, 'error');
    });
    setTimeout(test.done, 50);
},

    'timesSeries': function(test){
    test.expect(2);
    var call_order = [];
    async.timesSeries(5, function(n, callback){
        setTimeout(function(){
            call_order.push(n);
            callback(null, n);
        }, 100 - n * 10);
    }, function(err, results){
        test.same(call_order, [0,1,2,3,4]);
        test.same(results, [0,1,2,3,4]);
        test.done();
    });
},

    'timesSeries error': function(test){
    test.expect(1);
    async.timesSeries(5, function(n, callback){
        callback('error');
    }, function(err){
        test.equals(err, 'error');
    });
    setTimeout(test.done, 50);
},

    'timesLimit': function(test){
    test.expect(7);

    var limit = 2;
    var running = 0;
    async.timesLimit(5, limit, function (i, next) {
        running++;
        test.ok(running <= limit && running > 0, running);
        setTimeout(function () {
            running--;
            next(null, i * 2);
        }, (3 - i) * 10);
    }, function(err, results){
        test.ok(err === null, err + " passed instead of 'null'");
        test.same(results, [0, 2, 4, 6, 8]);
        test.done();
    });
}

};

console_fn_tests('log');
console_fn_tests('dir');
/*console_fn_tests('info');
console_fn_tests('warn');
console_fn_tests('error');*/


exports['concat'] = function(test){
    test.expect(3);
    var call_order = [];
    var iteratee = function (x, cb) {
        setTimeout(function(){
            call_order.push(x);
            var r = [];
            while (x > 0) {
                r.push(x);
                x--;
            }
            cb(null, r);
        }, x*25);
    };
    async.concat([1,3,2], iteratee, function(err, results){
        test.same(results, [1,2,1,3,2,1]);
        test.same(call_order, [1,2,3]);
        test.ok(err === null, err + " passed instead of 'null'");
        test.done();
    });
};

exports['concat error'] = function(test){
    test.expect(1);
    var iteratee = function (x, cb) {
        cb(new Error('test error'));
    };
    async.concat([1,2,3], iteratee, function(err){
        test.ok(err);
        test.done();
    });
};

exports['concatSeries'] = function(test){
    test.expect(3);
    var call_order = [];
    var iteratee = function (x, cb) {
        setTimeout(function(){
            call_order.push(x);
            var r = [];
            while (x > 0) {
                r.push(x);
                x--;
            }
            cb(null, r);
        }, x*25);
    };
    async.concatSeries([1,3,2], iteratee, function(err, results){
        test.same(results, [1,3,2,1,2,1]);
        test.same(call_order, [1,3,2]);
        test.ok(err === null, err + " passed instead of 'null'");
        test.done();
    });
};

exports['until'] = function (test) {
    test.expect(4);

    var call_order = [];
    var count = 0;
    async.until(
        function () {
            call_order.push(['test', count]);
            return (count == 5);
        },
        function (cb) {
            call_order.push(['iteratee', count]);
            count++;
            cb(null, count);
        },
        function (err, result) {
            test.ok(err === null, err + " passed instead of 'null'");
            test.equals(result, 5, 'last result passed through');
            test.same(call_order, [
                ['test', 0],
                ['iteratee', 0], ['test', 1],
                ['iteratee', 1], ['test', 2],
                ['iteratee', 2], ['test', 3],
                ['iteratee', 3], ['test', 4],
                ['iteratee', 4], ['test', 5],
            ]);
            test.equals(count, 5);
            test.done();
        }
    );
};

exports['doUntil'] = function (test) {
    test.expect(4);

    var call_order = [];
    var count = 0;
    async.doUntil(
        function (cb) {
            call_order.push(['iteratee', count]);
            count++;
            cb(null, count);
        },
        function () {
            call_order.push(['test', count]);
            return (count == 5);
        },
        function (err, result) {
            test.ok(err === null, err + " passed instead of 'null'");
            test.equals(result, 5, 'last result passed through');
            test.same(call_order, [
                ['iteratee', 0], ['test', 1],
                ['iteratee', 1], ['test', 2],
                ['iteratee', 2], ['test', 3],
                ['iteratee', 3], ['test', 4],
                ['iteratee', 4], ['test', 5]
            ]);
            test.equals(count, 5);
            test.done();
        }
    );
};

exports['doUntil callback params'] = function (test) {
    test.expect(3);

    var call_order = [];
    var count = 0;
    async.doUntil(
        function (cb) {
            call_order.push(['iteratee', count]);
            count++;
            cb(null, count);
        },
        function (c) {
            call_order.push(['test', c]);
            return (c == 5);
        },
        function (err, result) {
            if (err) throw err;
            test.equals(result, 5, 'last result passed through');
            test.same(call_order, [
                ['iteratee', 0], ['test', 1],
                ['iteratee', 1], ['test', 2],
                ['iteratee', 2], ['test', 3],
                ['iteratee', 3], ['test', 4],
                ['iteratee', 4], ['test', 5]
            ]);
            test.equals(count, 5);
            test.done();
        }
    );
};

exports['whilst'] = function (test) {
    test.expect(4);

    var call_order = [];

    var count = 0;
    async.whilst(
        function () {
            call_order.push(['test', count]);
            return (count < 5);
        },
        function (cb) {
            call_order.push(['iteratee', count]);
            count++;
            cb(null, count);
        },
        function (err, result) {
            test.ok(err === null, err + " passed instead of 'null'");
            test.equals(result, 5, 'last result passed through');
            test.same(call_order, [
                ['test', 0],
                ['iteratee', 0], ['test', 1],
                ['iteratee', 1], ['test', 2],
                ['iteratee', 2], ['test', 3],
                ['iteratee', 3], ['test', 4],
                ['iteratee', 4], ['test', 5],
            ]);
            test.equals(count, 5);
            test.done();
        }
    );
};

exports['doWhilst'] = function (test) {
    test.expect(4);
    var call_order = [];

    var count = 0;
    async.doWhilst(
        function (cb) {
            call_order.push(['iteratee', count]);
            count++;
            cb(null, count);
        },
        function () {
            call_order.push(['test', count]);
            return (count < 5);
        },
        function (err, result) {
            test.ok(err === null, err + " passed instead of 'null'");
            test.equals(result, 5, 'last result passed through');
            test.same(call_order, [
                ['iteratee', 0], ['test', 1],
                ['iteratee', 1], ['test', 2],
                ['iteratee', 2], ['test', 3],
                ['iteratee', 3], ['test', 4],
                ['iteratee', 4], ['test', 5]
            ]);
            test.equals(count, 5);
            test.done();
        }
    );
};

exports['doWhilst callback params'] = function (test) {
    test.expect(3);
    var call_order = [];
    var count = 0;
    async.doWhilst(
        function (cb) {
            call_order.push(['iteratee', count]);
            count++;
            cb(null, count);
        },
        function (c) {
            call_order.push(['test', c]);
            return (c < 5);
        },
        function (err, result) {
            if (err) throw err;
            test.equals(result, 5, 'last result passed through');
            test.same(call_order, [
                ['iteratee', 0], ['test', 1],
                ['iteratee', 1], ['test', 2],
                ['iteratee', 2], ['test', 3],
                ['iteratee', 3], ['test', 4],
                ['iteratee', 4], ['test', 5]
            ]);
            test.equals(count, 5);
            test.done();
        }
    );
};

exports['doWhilst - error'] = function (test) {
    test.expect(1);
    var error = new Error('asdas');

    async.doWhilst(
        function (cb) {
            cb(error);
        },
        function () {},
        function (err) {
            test.equal(err, error);
            test.done();
        }
    );
};

exports['during'] = function (test) {
    var call_order = [];

    var count = 0;
    async.during(
        function (cb) {
            call_order.push(['test', count]);
            cb(null, count < 5);
        },
        function (cb) {
            call_order.push(['iteratee', count]);
            count++;
            cb();
        },
        function (err) {
            test.ok(err === null, err + " passed instead of 'null'");
            test.same(call_order, [
                ['test', 0],
                ['iteratee', 0], ['test', 1],
                ['iteratee', 1], ['test', 2],
                ['iteratee', 2], ['test', 3],
                ['iteratee', 3], ['test', 4],
                ['iteratee', 4], ['test', 5],
            ]);
            test.equals(count, 5);
            test.done();
        }
    );
};

exports['doDuring'] = function (test) {
    var call_order = [];

    var count = 0;
    async.doDuring(
        function (cb) {
            call_order.push(['iteratee', count]);
            count++;
            cb();
        },
        function (cb) {
            call_order.push(['test', count]);
            cb(null, count < 5);
        },
        function (err) {
            test.ok(err === null, err + " passed instead of 'null'");
            test.same(call_order, [
                ['iteratee', 0], ['test', 1],
                ['iteratee', 1], ['test', 2],
                ['iteratee', 2], ['test', 3],
                ['iteratee', 3], ['test', 4],
                ['iteratee', 4], ['test', 5],
            ]);
            test.equals(count, 5);
            test.done();
        }
    );
};

exports['doDuring - error test'] = function (test) {
    test.expect(1);
    var error = new Error('asdas');

    async.doDuring(
        function (cb) {
            cb(error);
        },
        function () {},
        function (err) {
            test.equal(err, error);
            test.done();
        }
    );
};

exports['doDuring - error iteratee'] = function (test) {
    test.expect(1);
    var error = new Error('asdas');

    async.doDuring(
        function (cb) {
            cb(null);
        },
        function (cb) {
            cb(error);
        },
        function (err) {
            test.equal(err, error);
            test.done();
        }
    );
};

exports['whilst optional callback'] = function (test) {
    var counter = 0;
    async.whilst(
        function () { return counter < 2; },
        function (cb) {
            counter++;
            cb();
        }
    );
    test.equal(counter, 2);
    test.done();
};

exports['ensureAsync'] = {
    'defer sync functions': function (test) {
        test.expect(6);
        var sync = true;
        async.ensureAsync(function (arg1, arg2, cb) {
            test.equal(arg1, 1);
            test.equal(arg2, 2);
            cb(null, 4, 5);
        })(1, 2, function (err, arg4, arg5) {
            test.equal(err, null);
            test.equal(arg4, 4);
            test.equal(arg5, 5);
            test.ok(!sync, 'callback called on same tick');
            test.done();
        });
        sync = false;
    },

    'do not defer async functions': function (test) {
        test.expect(6);
        var sync = false;
        async.ensureAsync(function (arg1, arg2, cb) {
            test.equal(arg1, 1);
            test.equal(arg2, 2);
            async.setImmediate(function () {
                sync = true;
                cb(null, 4, 5);
                sync = false;
            });
        })(1, 2, function (err, arg4, arg5) {
            test.equal(err, null);
            test.equal(arg4, 4);
            test.equal(arg5, 5);
            test.ok(sync, 'callback called on next tick');
            test.done();
        });
    },

    'double wrapping': function (test) {
        test.expect(6);
        var sync = true;
        async.ensureAsync(async.ensureAsync(function (arg1, arg2, cb) {
            test.equal(arg1, 1);
            test.equal(arg2, 2);
            cb(null, 4, 5);
        }))(1, 2, function (err, arg4, arg5) {
            test.equal(err, null);
            test.equal(arg4, 4);
            test.equal(arg5, 5);
            test.ok(!sync, 'callback called on same tick');
            test.done();
        });
        sync = false;
    }
};

exports['constant'] = function (test) {
    test.expect(5);
    var f = async.constant(42, 1, 2, 3);
    f(function (err, value, a, b, c) {
        test.ok(!err);
        test.ok(value === 42);
        test.ok(a === 1);
        test.ok(b === 2);
        test.ok(c === 3);
        test.done();
    });
};

exports['asyncify'] = {
    'asyncify': function (test) {
        var parse = async.asyncify(JSON.parse);
        parse("{\"a\":1}", function (err, result) {
            test.ok(!err);
            test.ok(result.a === 1);
            test.done();
        });
    },

    'asyncify null': function (test) {
        var parse = async.asyncify(function() {
            return null;
        });
        parse("{\"a\":1}", function (err, result) {
            test.ok(!err);
            test.ok(result === null);
            test.done();
        });
    },

    'variable numbers of arguments': function (test) {
        async.asyncify(function (x, y, z) {
            test.ok(arguments.length === 3);
            test.ok(x === 1);
            test.ok(y === 2);
            test.ok(z === 3);
        })(1, 2, 3, function () {});
        test.done();
    },

    'catch errors': function (test) {
        async.asyncify(function () {
            throw new Error("foo");
        })(function (err) {
            test.ok(err);
            test.ok(err.message === "foo");
            test.done();
        });
    },

    'dont catch errors in the callback': function (test) {
        try {
            async.asyncify(function () {})(function (err) {
                if (err) {
                    return test.done(new Error("should not get an error here"));
                }
                throw new Error("callback error");
            });
        } catch (e) {
            test.ok(e.message === "callback error");
            test.done();
        }
    },

    'promisified': [
        'native-promise-only',
        'bluebird',
        'es6-promise',
        'rsvp'
    ].reduce(function(promises, name) {
        if (isBrowser()) {
            // node only test
            return;
        }
        var Promise = require(name);
        if (typeof Promise.Promise === 'function') {
            Promise = Promise.Promise;
        }
        promises[name] = {
            'resolve': function(test) {
                var promisified = function(argument) {
                    return new Promise(function (resolve) {
                        setTimeout(function () {
                            resolve(argument + " resolved");
                        }, 15);
                    });
                };
                async.asyncify(promisified)("argument", function (err, value) {
                    if (err) {
                        return test.done(new Error("should not get an error here"));
                    }
                    test.ok(value === "argument resolved");
                    test.done();
                });
            },

            'reject': function(test) {
                var promisified = function(argument) {
                    return new Promise(function (resolve, reject) {
                        reject(argument + " rejected");
                    });
                };
                async.asyncify(promisified)("argument", function (err) {
                    test.ok(err);
                    test.ok(err.message === "argument rejected");
                    test.done();
                });
            }
        };
        return promises;
    }, {})
};

exports['timeout'] = function (test) {
    test.expect(4);

    async.series([
        async.timeout(function asyncFn(callback) {
            setTimeout(function() {
                callback(null, 'I didn\'t time out');
            }, 50);
        }, 200),
        async.timeout(function asyncFn(callback) {
            setTimeout(function() {
                callback(null, 'I will time out');
            }, 300);
        }, 150)
    ],
    function(err, results) {
        test.ok(err.message === 'Callback function "asyncFn" timed out.');
        test.ok(err.code === 'ETIMEDOUT');
        test.ok(err.info === undefined);
        test.ok(results[0] === 'I didn\'t time out');
        test.done();
    });
};

exports['timeout with info'] = function (test) {
    test.expect(4);

    var info = { custom: 'info about callback' };
    async.series([
        async.timeout(function asyncFn(callback) {
            setTimeout(function() {
                callback(null, 'I didn\'t time out');
            }, 50);
        }, 200),
        async.timeout(function asyncFn(callback) {
            setTimeout(function() {
                callback(null, 'I will time out');
            }, 300);
        }, 150, info)
    ],
    function(err, results) {
        test.ok(err.message === 'Callback function "asyncFn" timed out.');
        test.ok(err.code === 'ETIMEDOUT');
        test.ok(err.info === info);
        test.ok(results[0] === 'I didn\'t time out');
        test.done();
    });
};

exports['timeout with parallel'] = function (test) {
    test.expect(4);

    async.parallel([
        async.timeout(function asyncFn(callback) {
            setTimeout(function() {
                callback(null, 'I didn\'t time out');
            }, 50);
        }, 200),
        async.timeout(function asyncFn(callback) {
            setTimeout(function() {
                callback(null, 'I will time out');
            }, 300);
        }, 150)
    ],
    function(err, results) {
        test.ok(err.message === 'Callback function "asyncFn" timed out.');
        test.ok(err.code === 'ETIMEDOUT');
        test.ok(err.info === undefined);
        test.ok(results[0] === 'I didn\'t time out');
        test.done();
    });
};
