
let __cycle = 0, __cycle_pre = -1;
// let __async_callee = [];
// let __await_callee_list = [];
let __p_list = [];

function __create_log (loc, range, type) {
  //cycleを更新
  if(__cycle > __cycle_pre) {
    __cycle_pre = __cycle;
    process.nextTick(() => {
      // console.log('update');
      __cycle++;
      __logs.push({
        logtype: 'esprima',
        time: __get_time(),
        type: 'update_cycle',
        cycle: __cycle
      });
    });
  }

  // if(__trace === undefined) __trace = __get_trace();
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
function __func_begin (loc, range, dif_range, func_id, func_name, is_async) {
  var log = __create_log(loc, range, "func_begin");
  var key = func_list.indexOf(func_name);
  if(key == -1){
    func_list.push(func_name);
    func_count.push(0);
    key = func_count.length-1;
  }else{
    func_count[key]++;
  }
  // log.point = point;
  log.dif_range = dif_range;
  log.func_id = func_id;
  log.func_name = func_name;
  log.count = func_count[key];
  // if(is_async == undefined) is_async = false;
  log.async = is_async;
  __logs.push(log);
}

function __func_end (ret, loc, range, func_id, func_name, is_async) {
  var log = __create_log(loc, range, "func_end");
  log.func_id = func_id;
  log.func_name = func_name;
  log.count = func_count[func_list.indexOf(func_id)];
  log.async = is_async;
  __logs.push(log);
  return ret;
}



function __await (p, loc, range, func_id, func_name, is_async) {
  var log = __create_log(loc, range, "await");
  log.func_id = func_id;
  log.func_name = func_name;
  //log.count = func_count[func_list.indexOf(func_id)];
  log.async = is_async;

  if(p != undefined && typeof(p.then) === 'function') log.value = false
  else log.value = true;
  __logs.push(log);
  return p;
}

function __resume (value, loc, range, func_id, func_name, is_async) {
  var log = __create_log(loc, range, "resume");
  log.func_id = func_id;
  log.func_name = func_name;
  //log.count = func_count[func_list.indexOf(func_id)];
  log.async = is_async;
  __logs.push(log);
  return value;
}

function __promise (loc, range) {
  var log = __create_log(loc, range, "promise");
  // console.log('yonnda')
  // log.func_id = func_id;
  // log.func_name = func_name;
  //log.count = func_count[func_list.indexOf(func_id)];
  // log.async = is_async;
  __logs.push(log);
}
function __promise_wrap (func_call, p) {
  return p;
}



// function __eval (loc, range, type) {
//   var log = __create_log(loc, range, "eval");
//   __logs.push(log);
// }

// function __get_func_log (eval, p, loc, range) {
//   if(p !== undefined && typeof p.then === "function"){
//     var log = __create_log(loc, range, "return promise");
//     __logs.push(log);
//     __p_list.push(__p);
//   }
//   return __p;
// }
