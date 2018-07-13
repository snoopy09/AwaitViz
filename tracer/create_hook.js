const async_hooks = require("async_hooks");
const fs = require("fs");
const stackTrace = require('stack-trace');
const performance = require('perf_hooks').performance;
let logs = require('./logs.js');

function get_time () {
  return performance.now();
}

function get_trace () {
  var trace = stackTrace.get();
  var line = trace.map(t => t.getLineNumber()).join(',');
  var column = trace.map(t => t.getColumnNumber()).join(',');
  return {line: line, column: column};
}

function create_hook () {
  async_hooks.createHook({
    init(asyncId, type, triggerAsyncId) {
      // とりあえずPROMISE以外は捨て
      //var eid, trace={};
      if(type === 'PROMISE'){
        var eid = async_hooks.executionAsyncId();
        var trace = get_trace ();
        logs.push({
          logtype: 'hook',
          time: get_time(),
          type: type,
          id: asyncId,
          tid: triggerAsyncId,
          eid: eid,
          line: trace.line,
          column: trace.column
        });
      }
      //logs.push({type: type, id: asyncId, tid: triggerAsyncId, eid: eid, lines: trace.lines, columns: trace.columns});
    },
    before(asyncId) {
      var eid = async_hooks.executionAsyncId();
      var tid = async_hooks.triggerAsyncId();
      var trace = get_trace ();
      logs.push({
        logtype: 'hook',
        time: get_time(),
        type: 'before',
        id: asyncId,
        tid: tid,
        eid: eid,
        line: trace.line,
        column: trace.column
      });
    },
    after(asyncId) {
      //logs.push({type: 'after', id: asyncId});
    },
    destroy(asyncId) {
      //logs.push({type: 'destroy', id: asyncId});
    },
    promiseResolve(asyncId) {
      var eid = async_hooks.executionAsyncId();
      var tid = async_hooks.triggerAsyncId();
      var trace = get_trace ();
      logs.push({
        logtype: 'hook',
        time: get_time(),
        type: 'promiseResolve',
        id: asyncId,
        eid: eid,
        tid: tid,
        line: trace.line,
        column: trace.column
      });
      //console.log(logs[logs.length-1]);
    },
    // //rejectなさそう
    // promiseReject(asyncId) {
    //   var eid = async_hooks.executionAsyncId();
    //   var tid = async_hooks.triggerAsyncId();
    //   var trace = get_trace ();
    //   logs.push({
    //     logtype: 'hook',
    //     type: 'promiseReject',
    //     id: asyncId,
    //     eid: eid,
    //     tid: tid,
    //     line: trace.line,
    //     column: trace.column
    //   });
    // },
  }).enable();
}

module.exports = create_hook;
