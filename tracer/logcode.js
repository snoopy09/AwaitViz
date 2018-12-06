const __LOGFILEPATH = 'data/log.json';
const __fs = require('fs');
const __stackTrace = require('stack-trace');
let __logs = require('./logs.js');
const __performance = require('perf_hooks').performance;
const __start = __get_time();
function __get_time() {
    return __performance.now();
}
function __get_trace() {
    var trace = __stackTrace.get();
    var line = trace.map(t => t.getLineNumber()).join(',');
    var column = trace.map(t => t.getColumnNumber()).join(',');
    return {
        line: line,
        column: column
    };
}
process.once('beforeExit', function () {
    var text = `{"list": [${ __logs.map(__make_text).join(',\n') }]}`;
    __fs.writeFileSync(__LOGFILEPATH, text);
});
var log_id = 0;
function __make_text(log) {
    var text;
    switch (log.logtype) {
    case 'hook':
        text = `{
    "log_id": "${ log_id++ }",
    "logtype": "${ log.logtype }",
    "time": "${ log.time - __start }",
    "type": "${ log.type }",
    "id": "${ log.id }",
    "tid": "${ log.tid }",
    "eid": "${ log.eid }"
}`;
        break;
    case 'monkey':
        text = `{
    "log_id": "${ log_id++ }",
    "logtype": "${ log.logtype }",
    "time": "${ log.time - __start }",
    "type": "${ log.type }",
    "caller": "${ log.caller }"
}`;
        break;
    case 'esprima':
        switch (log.type) {
        case 'func_begin':
            text = `{
    "log_id": "${ log_id++ }",
    "logtype": "${ log.logtype }",
    "time": "${ log.time - __start }",
    "type": "${ log.type }",
    "func_id": "${ log.func_id }",
    "func_name": "${ log.func_name }",
    "async": "${ log.async }",
    "cycle": "${ log.cycle }",
    "loc": "${ log.loc }",
    "range": "${ log.range }",
    "dif_range": "${ log.dif_range }"
}`;
            break;
        case 'await':
            text = `{
    "log_id": "${ log_id++ }",
    "logtype": "${ log.logtype }",
    "time": "${ log.time - __start }",
    "type": "${ log.type }",
    "func_id": "${ log.func_id }",
    "func_name": "${ log.func_name }",
    "async": "${ log.async }",
    "value": "${ log.value }",
    "cycle": "${ log.cycle }",
    "loc": "${ log.loc }",
    "range": "${ log.range }"
}`;
            break;
        case 'func_end':
        case 'resume':
            text = `{
    "log_id": "${ log_id++ }",
    "logtype": "${ log.logtype }",
    "time": "${ log.time - __start }",
    "type": "${ log.type }",
    "func_id": "${ log.func_id }",
    "func_name": "${ log.func_name }",
    "async": "${ log.async }",
    "cycle": "${ log.cycle }",
    "loc": "${ log.loc }",
    "range": "${ log.range }"
}`;
            break;
        case 'promise':
            text = `{
    "log_id": "${ log_id++ }",
    "logtype": "${ log.logtype }",
    "time": "${ log.time - __start }",
    "type": "${ log.type }",
    "cycle": "${ log.cycle }",
    "loc": "${ log.loc }",
    "range": "${ log.range }"
}`;
            break;
        case 'update_cycle':
            text = `{
    "log_id": "${ log_id++ }",
    "logtype": "${ log.logtype }",
    "time": "${ log.time - __start }",
    "type": "${ log.type }",
    "cycle": "${ log.cycle }"
}`;
            break;
        }
        break;
    }
    return text;
}
(function () {
    var old_then = Promise.prototype.then;
    Promise.prototype.then = function (on_resolved, on_rejected) {
        var trace = __get_trace();
        if (on_resolved != undefined && on_resolved.toString() == 'function () { [native code] }')
            var caller = 'auto';
        else
            var caller = 'user';
        __logs.push({
            logtype: 'monkey',
            time: __get_time(),
            type: 'then',
            caller: caller,
            line: trace.line,
            column: trace.column
        });
        var return_value = old_then.apply(this, arguments);
        return return_value;
    };
    var old_Promise = Promise;
    Promise = function (arguments) {
        var trace = __get_trace();
        if (arguments != undefined && arguments.toString() === 'function () { [native code] }')
            var caller = 'auto';
        else
            var caller = 'user';
        __logs.push({
            logtype: 'monkey',
            time: __get_time(),
            type: 'Promise',
            caller: caller,
            line: trace.line,
            column: trace.column
        });
        var self = new old_Promise(arguments);
        return self;
    };
}());
let __cycle = 0, __cycle_pre = -1;
let __p_list = [];
function __create_log(loc, range, type) {
    if (__cycle > __cycle_pre) {
        __cycle_pre = __cycle;
        process.nextTick(() => {
            __cycle++;
            __logs.push({
                logtype: 'esprima',
                time: __get_time(),
                type: 'update_cycle',
                cycle: __cycle
            });
        });
    }
    var trace = __get_trace();
    return {
        logtype: 'esprima',
        time: __get_time(),
        type: type,
        cycle: __cycle,
        loc: loc,
        range: range,
        line: trace.line,
        column: trace.column
    };
}
var func_list = [];
var func_count = [];
function __func_begin(loc, range, dif_range, func_id, func_name, is_async) {
    var log = __create_log(loc, range, 'func_begin');
    var key = func_list.indexOf(func_name);
    if (key == -1) {
        func_list.push(func_name);
        func_count.push(0);
        key = func_count.length - 1;
    } else {
        func_count[key]++;
    }
    log.dif_range = dif_range;
    log.func_id = func_id;
    log.func_name = func_name;
    log.count = func_count[key];
    log.async = is_async;
    __logs.push(log);
}
function __func_end(ret, loc, range, func_id, func_name, is_async) {
    var log = __create_log(loc, range, 'func_end');
    log.func_id = func_id;
    log.func_name = func_name;
    log.count = func_count[func_list.indexOf(func_id)];
    log.async = is_async;
    __logs.push(log);
    return ret;
}
function __await(p, loc, range, func_id, func_name, is_async) {
    var log = __create_log(loc, range, 'await');
    log.func_id = func_id;
    log.func_name = func_name;
    log.async = is_async;
    if (p != undefined && typeof p.then === 'function')
        log.value = false;
    else
        log.value = true;
    __logs.push(log);
    return p;
}
function __resume(value, loc, range, func_id, func_name, is_async) {
    var log = __create_log(loc, range, 'resume');
    log.func_id = func_id;
    log.func_name = func_name;
    log.async = is_async;
    __logs.push(log);
    return value;
}
function __promise(loc, range) {
    var log = __create_log(loc, range, 'promise');
    __logs.push(log);
}
function __promise_wrap(func_call, p) {
    return p;
}
__func_begin('1,0', '0,597', '0,597', 0, 'main program', false);
const fs = require('fs');
(async function () {
    __func_begin('2,1', '49,296', '27,298', 1, 'func@2:1', true);
    var response, filename;
    response = __resume(await __await(readFile('input_sample/a.txt'), '4,13', '86,123', 1, 'func@2:1', true), '4,13', '86,123', 1, 'func@2:1', true);
    filename = getFilename(response);
    response = __resume(await __await(readFile(filename), '6,13', '175,200', 1, 'func@2:1', true), '6,13', '175,200', 1, 'func@2:1', true);
    filename = getFilename(response);
    response = __resume(await __await(readFile(filename), '8,13', '252,277', 1, 'func@2:1', true), '8,13', '252,277', 1, 'func@2:1', true);
    show(response);
    __func_end(undefined, '2,1', '49,296', 1, 'func@2:1', true);
}());
function readFile(filename) {
    __func_begin('11,0', '336,469', '303,471', 2, 'readFile', false);
    return __func_end(__promise_wrap(__promise('12,9', '343,468'), new Promise(function (resolve) {
        __func_begin('12,22', '381,463', '356,467', 3, 'func@12:22', false);
        fs.readFile(filename, 'utf-8', function (err, text) {
            __func_begin('13,35', '441,455', '412,461', 4, 'func@13:35', false);
            resolve(text);
            __func_end(undefined, '13,35', '441,455', 4, 'func@13:35', false);
        });
        __func_end(undefined, '12,22', '381,463', 3, 'func@12:22', false);
    })), '11,0', '336,469', 2, 'readFile', false);
    __func_end(undefined, '11,0', '336,469', 2, 'readFile', false);
}
function getFilename(name) {
    __func_begin('18,0', '504,549', '472,551', 5, 'getFilename', false);
    return __func_end('input_sample/' + name.split('\n')[0], '18,0', '504,549', 5, 'getFilename', false);
    __func_end(undefined, '18,0', '504,549', 5, 'getFilename', false);
}
function show(text) {
    __func_begin('21,0', '577,595', '552,597', 6, 'show', false);
    console.log(text);
    __func_end(undefined, '21,0', '577,595', 6, 'show', false);
}
__func_end(undefined, '1,0', '0,597', 0, 'main program', false);