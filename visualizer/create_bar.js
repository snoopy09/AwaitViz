
function create_bar (logs, funcname, code){
  var all_log = logs;
  logs = logs.filter(l => l.logtype === 'esprima');


  var color_key = 0;
  function set_rgb () {
    // var color_list = [[255, 0, 51], [255, 204, 0], [51, 255, 0], [0, 255, 204], [0, 51, 255], [204, 0, 255], []];
    // var color_list = [[230, 0, 18], [243, 152, 0], [255, 241, 0], [143, 195, 31], [0, 153, 68], [0, 158, 150], [0, 160, 233], [0, 104, 183], [29, 32, 136], [146, 7, 131], [228, 0, 127], [229, 0, 79]];
    var color_list = [[230, 0, 18], [243, 152, 0], [255, 241, 0], [143, 195, 31], [0, 153, 68], [0, 160, 233], [0, 104, 183], [29, 32, 136], [146, 7, 131], [228, 0, 127], [229, 0, 79]];
    return color_list[color_key++%12];
  }
  var rgb_map = funcname.map(obj => set_rgb());
  var func_list = [];


  function set_name (log, is_resume) {
    var name = log.func_name;
    if(is_resume) {
      var loc = log.loc.split(',')[0]+':'+log.loc.split(',')[1];
      name += `(await@${loc})`;
    }
    return name;
  }
  function is_async_call (log) {
    var key = all_log.indexOf(log);
    if(key>0 && all_log[key-1].type === 'before') return true;
    else return false;
  }
  function get_range0 (log) {
    return parseInt(log.range.split(',')[0], 10);
  }
  function get_range1 (log) {
    return parseInt(log.range.split(',')[1], 10);
  }
  function get_time (log) {
    return parseFloat(log.time);
  }

  var tick = [{time: 0, cycle: 0}];
  var stack = [];
  for(var i=0;i<logs.length;i++){
    //console.log(func_list);
    var l = logs[i];
    switch(l.type){
      case 'func_begin':
      var name = set_name(l, false);
      var func = {
        log_id : l.log_id,
        id : l.func_id,
        name : name,
        count : func_list.filter(f => f.name==name).length,
        rgb : rgb_map[l.func_id],
        begin_t : get_time(l),
        begin_p : get_range0(l),
        is_resume : false,
        is_async_call : is_async_call(l)
      };
      func.y_name = func.name;
      // func.y_name = func.name+`(${func.count+1}th)`;
      stack.push(func);
      // console.log(stack);
      func_list.push(func);
      break;

      case 'func_end':
      var func = stack.pop();
      // console.log(stack);
      func.end_t = get_time(l);
      func.end_p = get_range1(l);
      func.is_resume = false;
      break;

      case 'await':
      var func = stack.pop();
      // console.log(stack);
      func.end_t = get_time(l);
      func.end_p = get_range1(l);
      func.is_resume = true;
      break;

      case 'resume':
      var name = set_name(l, true);
      var func = {
        log_id : l.log_id,
        id : l.func_id,
        name : name,
        count : func_list.filter(f => f.name==name).length,
        rgb : rgb_map[l.func_id],
        begin_t : get_time(l),
        begin_p : get_range1(l),
        is_resume : false,
        is_async_call : is_async_call(l)
      };
      func.y_name = func.name;
      // func.y_name = func.name+`(${func.count+1}th)`;
      stack.push(func);
      // console.log(stack);
      func_list.push(func);
      break;

      case 'update_cycle':
      tick.push({time: l.time, cycle: l.cycle});
      break;
    }
  }

  console.log(tick);
  var xaxis = {
    title: 'cycle',
    ticklen: 0,
    gridcolor: 'black',
    tickvals: tick.map(t => t.time),
    ticktext: tick.map(t => 'c'+t.cycle)
  }

  console.log(xaxis);
  //var names = func_list.map(func => get_name(func.id));
  // func_list.sort((n1, n2) => (n1.begin_t > n2.begin_t) ? 1 : -1);
  console.log(func_list);
  var new_func_list = [];
  var copy = [].concat(func_list);
  while(copy.length > 0){
    var first = copy.shift();
    new_func_list.unshift(first);
    for(var i=0;i<copy.length;i++){
      if(copy[i].y_name == first.y_name){
        new_func_list.unshift(copy[i]);
        copy.splice(i--, 1);
      }
    }
  }
  console.log(new_func_list);


  var data = [];
  new_func_list.forEach(func => {
    data.push({
      type : 'bar',
      orientation : 'h',
      showlegend: false,
      // text: (func.is_async_call)? 'async' : 'sync',
      hovertext: (func.is_async_call)? 'async call' : 'sync call',
      textposition: 'auto',
      textfont: {size: 15},
      constraintext: 'none',
      // cliponaxis: false,
      hoverinfo: 'text',
      y: [func.y_name],
      base: [func.begin_t],
      x: [func.end_t-func.begin_t],
      // code: set_text(func, code),
      range: [func.begin_p, func.end_p],
      // text: set_text(func, code),
      // text: `@${func.begin_p}~@${func.end_p}`,
      marker: {
        color: set_color(func.rgb, func.is_async_call),
        line: {
          color: set_color(func.rgb, false),
          width: 1
        }
      }
    });
  });

  function set_text (func, code) {
    var text = code.slice(func.begin_p, func.end_p);
    // console.log(text);
    return text;
  }

  function set_color (rgb, is_async_call) {
    var alpha = (is_async_call)? 0.4 : 1;
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  }
  function set_end (obj) {
    if(obj.end !== undefined) return obj.end;
    else return obj.begin;
  }

  //funcがある範囲を含んで実行されているかどうか(呼び出し元かどうか)
  function is_execute(func, begin, end){
    for(var i=0;i<func.begin_t.length;i++){
      if(func.begin_t[i]<=begin && func.end_t[i]>=end) return true;
    }
    return false;
  }

  // data.sort((n1, n2) => (n1.base[0] > n2.base[0])? 1 : -1);
  return {data: data, xaxis: xaxis, func_list: func_list};
}
