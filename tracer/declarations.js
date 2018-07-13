const __LOGFILEPATH = 'data/log.json';
const __fs = require('fs');
const __stackTrace = require('stack-trace');
let __logs = require('./logs.js');
const __performance = require('perf_hooks').performance;
const __start = __get_time();

function __get_time () {
  return __performance.now();
}

function __get_trace () {
  var trace = __stackTrace.get();
  var line = trace.map(t => t.getLineNumber()).join(',');
  var column = trace.map(t => t.getColumnNumber()).join(',');
  return {line: line, column: column};
}

// ログを出力
process.once('beforeExit', function () {
    var text = `{"list": [${__logs.map(__make_text).join(',\n')}]}`
    __fs.writeFileSync(__LOGFILEPATH, text);
});

var log_id = 0;
function __make_text (log) {
  var text;
  switch(log.logtype){
    case 'hook':
    text = `{
    "log_id": "${log_id++}",
    "logtype": "${log.logtype}",
    "time": "${log.time-__start}",
    "type": "${log.type}",
    "id": "${log.id}",
    "tid": "${log.tid}",
    "eid": "${log.eid}"
}`;
    break;
    case 'monkey':
    text = `{
    "log_id": "${log_id++}",
    "logtype": "${log.logtype}",
    "time": "${log.time-__start}",
    "type": "${log.type}",
    "caller": "${log.caller}"
}`;
    break;
    case 'esprima':
    switch(log.type){
      case 'func_begin':
      text = `{
    "log_id": "${log_id++}",
    "logtype": "${log.logtype}",
    "time": "${log.time-__start}",
    "type": "${log.type}",
    "func_id": "${log.func_id}",
    "func_name": "${log.func_name}",
    "async": "${log.async}",
    "cycle": "${log.cycle}",
    "loc": "${log.loc}",
    "range": "${log.range}",
    "dif_range": "${log.dif_range}"
}`;
      break;
      case 'await':
      text = `{
    "log_id": "${log_id++}",
    "logtype": "${log.logtype}",
    "time": "${log.time-__start}",
    "type": "${log.type}",
    "func_id": "${log.func_id}",
    "func_name": "${log.func_name}",
    "async": "${log.async}",
    "value": "${log.value}",
    "cycle": "${log.cycle}",
    "loc": "${log.loc}",
    "range": "${log.range}"
}`;
      break;
      case 'func_end': case 'resume':
      text = `{
    "log_id": "${log_id++}",
    "logtype": "${log.logtype}",
    "time": "${log.time-__start}",
    "type": "${log.type}",
    "func_id": "${log.func_id}",
    "func_name": "${log.func_name}",
    "async": "${log.async}",
    "cycle": "${log.cycle}",
    "loc": "${log.loc}",
    "range": "${log.range}"
}`;
      break;

      case 'promise':
      text = `{
    "log_id": "${log_id++}",
    "logtype": "${log.logtype}",
    "time": "${log.time-__start}",
    "type": "${log.type}",
    "cycle": "${log.cycle}",
    "loc": "${log.loc}",
    "range": "${log.range}"
}`;
      break;

      case 'update_cycle':
      text = `{
    "log_id": "${log_id++}",
    "logtype": "${log.logtype}",
    "time": "${log.time-__start}",
    "type": "${log.type}",
    "cycle": "${log.cycle}"
}`;
      break;
    }
    break;
  }
  return text;
}
