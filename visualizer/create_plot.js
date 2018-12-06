var nodes = [];
var lines = [];
var frames = [{name:"0", data:[]}];
var cycle=0;
var max_cycle = 5;
// const pending_color = ['#ff9900', '#ffad33', '#ffc266', '#ffd699'];
// const pending_color = ['#66ff00', '#85ff33', '#a3ff66', '#c2ff99'];
// const resolve_color = ['#0066ff', '#3385ff', '#66a3ff', '#99c2ff'];
// const pending_color = ['#F5B090', '#FCD7A1', '#FFF9B1', '#A5D4AD', '#A2D7D4', '#9FD9F6', '#A3BCE2'];
// const resolve_color = ['#D7000F', '#E48E00', '#F3E100', '#009140', '#00958D', '#0097DB', '#0062AC'];
const pending_color = ['#FFB2A8', '#FECEA3', '#FEFAC1', '#9FE9B4', '#9FB9E9', '#D8B4EE', '#999999'];
const resolve_color = ['#F41C00', '#FE8A23', '#F3E100', '#2CC357', '#376DD1', '#9937D1', '#666666'];
const type_num = 7*2;

let code_length;

function get_range0 (log) {
  return parseInt(log.range.split(',')[0], 10);
}
function get_range1 (log) {
  return parseInt(log.range.split(',')[1], 10);
}
function get_node (key_id) {
  for(var n of nodes) {
    if(n.id === key_id) return n;
  }
}

function define_xyz (node) {
  // node.x = (get_node(node.eid) != undefined) ? node.eid : node.tid;
  node.x = node.id;
  node.y = node.time;
  // if(node.point != undefined) node.z = node.point;
  // else node.z = node.range[0];
  // node.z = code_length - node.z;
  node.z = (function () {
    switch(node.nodetype){
      case 'Promiseauto': return 'NaN';
      case 'Promiseuser': return 'new Promise()';
      case 'thenauto': return 'relaying then';
      case 'thenuser': return '.then()';
      case 'async function': return 'async()';
      case 'await1' : return 'wrapping Promise';
      case 'await2' : return 'continuation closure';
    }
  })();
  return node;
}

function create_plot (logs, func_list, code) {
  code_length = code.length;
  //var time=0, cycle=0;
  for(var i=0;i<logs.length;i++) {
    var l = logs[i];
    switch(l.logtype){
      case 'esprima':
      cycle = l.cycle;
      break;

      case 'hook':
      switch(l.type){
        case 'PROMISE':
        l.cycle = cycle;
        //l.time = time++;
        if(i !== 0 && logs[i-1].logtype === 'monkey'){
          l.nodetype = logs[i-1].type + logs[i-1].caller;
          if(l.nodetype === 'Promiseuser'){
            l.range = [get_range0(logs[i-2]), get_range1(logs[i-2])];
          // }else if(l.nodetype === 'thenauto'){
          //   l.point = get_node(l.tid).range[0]+10;
          }else{
            l.range = [0, 0];
          }
        }else{
          if(logs[i+1].logtype === 'esprima' && logs[i+1].type === 'func_begin' && logs[i+1].async === 'true'){
            l.nodetype = 'async function';
            var func = func_list.filter(f => f.log_id==logs[i+1].log_id)[0];
            // console.log(func);
            // l.range = [func.begin_p, func.end_p];
            l.range = [parseInt(logs[i+1].dif_range.split(',')[0], 10), parseInt(logs[i+1].dif_range.split(',')[1], 10)];
            // l.point = logs[i+1].point;
            // console.log(l.range);
          } else if (logs[i-1].logtype === 'esprima' && logs[i-1].type === 'await') {
            l.nodetype = 'await1'
            l.range = [get_range0(logs[i-1]), get_range1(logs[i-1])];
            // console.log(l.range);
          } else if (logs[i-2].logtype === 'esprima' && logs[i-2].type === 'await') {
            l.nodetype = 'await2'
            l.range = [get_range0(logs[i-2]), get_range1(logs[i-2])];
            // l.point = l.range[0]+6;
            // console.log(l.range);
          } else {
            l.nodetype = 'unknown';
          }
        }
        l.state = 'pending';

        var node = define_xyz(l);
        nodes.push(node);
        // var pro = get_node(node.eid);
        // if(pro == undefined) pro = get_node(node.tid);
        // if(pro != undefined) lines.push({n1: pro, n2: node, type: 'create'});
        var p_eid = get_node(l.eid);
        var p_tid = get_node(l.tid);
        switch(node.nodetype){
          case 'thenuser':
          if(p_tid != undefined) lines.push({n1: p_tid, n2: node, type: 'normal.then', create: true});
          break;

          case 'thenauto':
          if(p_tid != undefined) lines.push({n1: p_tid, n2: node, type: 'auto.then', create: true});
          break;

          case 'await1':
          if(p_tid != undefined) lines.push({n1: p_tid, n2: node, type: 'await group', create: true});
          break;

          case 'await2':
          if(p_tid != undefined) lines.push({n1: p_tid, n2: node, type: 'implicit.then', create: true});
          break;

          default:
          // if(p_eid != undefined) lines.push({n1: p_eid, n2: node, type: 'executor', create: true});
          break;

        }
        frames.push(create_frame(nodes, l.time));
        break;


        case 'promiseResolve':
        var self = get_node(l.id);
        if(self.nodetype === 'await1' && self.value === 'false' && self.nonresolve === undefined){
          self.nonresolve = true;
          break;
        }
        self.state = 'resolved';
        self.resolvetime = l.time;
        var p_eid = get_node(l.eid);
        var p_tid = get_node(l.tid);
        switch(self.nodetype){
          case 'thenuser':
          if(p_tid != undefined) lines.push({n1: p_tid, n2: self, type: 'normal.then resolve', create: false});
          break;

          case 'thenauto':
          if(p_tid != undefined) lines.push({n1: p_tid, n2: self, type: 'auto.then resolve', create: false});
          break;

          case 'await1':
          // console.log(p_tid);
          if(p_eid != undefined && p_eid.nodetype === 'thenauto') lines.push({n1: p_eid, n2: self, type: 'wrapping Promise resolve', create: false});
          break;

          case 'await2':
          if(p_tid != undefined && p_tid.nodetype === 'await1') lines.push({n1: p_tid, n2: self, type: 'implicit.then resolve', create: false});
          // if(p_tid != undefined && p_tid.nodetype === 'await2') lines.push({n1: p_tid, n2: self, type: 'complete exec', create: true});
          break;

          // case 'asyncFunc':
          // if(p_tid != undefined) lines.push({n1: p_tid, n2: node, type: 'complete function', create: true});
          // break;

          // default:
          // if(p_eid != undefined) lines.push({n1: p_eid, n2: node, type: 'executor', create: true});
          // break;

        }
        frames.push(create_frame(nodes, l.time));
        break;
      }
      break;


      case 'monkey':
      break;
    }
  }

  //データの長さを揃える
  frames.forEach(frame => {
    while(frame.data.length < lines.length+type_num){
      frame.data.push({x:[], y:[], z:[]});
    }
  })
  // console.log(frames);


  var data = [];
  for(var i=0;i<type_num;i++){
    data.push({
      hoverinfo: 'name',
      hoverlabel: {namelength: -1},
      mode: 'markers',
      // mode: 'markers+text',
      type: 'scatter3d',
      textposition: 'top left',
      showlegend: false
    });
  }
  lines.forEach(line => {
    data.push({
      hoverinfo: 'name',
      mode: 'lines',
      type: 'scatter3d', //3Dの離散グラフに
      line: {
        width: 4,
        color: [0, 100]
      },
      showlegend: false
    });
  });

  return {data: data, frames: frames, nodes: nodes};
}




function create_frame (nodes, time) {
  var frame = [];

  var pendings = nodes.filter(n => n.state == 'pending');
  var resolves = nodes.filter(n => n.state == 'resolved');
  frame.push(node_frame(pendings.filter(n => n.nodetype === 'async function'), 'asyncFunc()', 5, 0));
  frame.push(node_frame(pendings.filter(n => n.nodetype === 'await2'), 'register closure', 3, 1));
  frame.push(node_frame(pendings.filter(n => n.nodetype === 'await1'), 'wrapping Promsie', 3, 2));
  frame.push(node_frame(pendings.filter(n => n.nodetype === 'thenauto'), 'relay then', 3, 3));
  frame.push(node_frame(pendings.filter(n => n.nodetype === 'Promiseuser'), 'new Promise()', 5, 4));
  frame.push(node_frame(pendings.filter(n => n.nodetype === 'thenuser'), '.then()', 5, 5));
  frame.push(node_frame(pendings.filter(n => n.nodetype === 'Promiseauto'), 'NaN', 3, 6));
  frame.push(node_frame(resolves.filter(n => n.nodetype === 'async function'), 'asyncFunc()', 5, 0));
  frame.push(node_frame(resolves.filter(n => n.nodetype === 'await2'), 'register closure', 3, 1));
  frame.push(node_frame(resolves.filter(n => n.nodetype === 'await1'), 'wrapping Promsie', 3, 2));
  frame.push(node_frame(resolves.filter(n => n.nodetype === 'thenauto'), 'relay then', 3, 3));
  frame.push(node_frame(resolves.filter(n => n.nodetype === 'Promiseuser'), 'new Promise()', 5, 4));
  frame.push(node_frame(resolves.filter(n => n.nodetype === 'thenuser'), '.then()', 5, 5));
  frame.push(node_frame(resolves.filter(n => n.nodetype === 'Promiseauto'), 'NaN', 3, 6));

  function node_frame (nodes, text, size, color_n){
    if(nodes.length > 0) var state = nodes[0].state;
    return {
      x: nodes.map(n => n.x),
      y: nodes.map(n => n.y),
      z: nodes.map(n => n.z),
      id: nodes.map(n => n.id),
      text: text,
      // name: nodes.map(n => n.state),
      name: state,
      marker: {
        size: size,
        color: nodes.map(n => {
          switch(n.state){
            case 'pending': return pending_color[color_n];
            case 'resolved': return resolve_color[color_n];
          }
        })
      }
    }
  }

  lines.forEach(line => {
    frame.push({
      x: [line.n1.x, line.n2.x],
      y: [line.n1.y, line.n2.y],
      z: [line.n1.z, line.n2.z],
      line: {
        colorscale: (function () {
          switch(line.type){
            case 'normal.then': return make_scale(pending_color[5]);
            case 'auto.then': return make_scale(pending_color[3]);
            case 'await group': return make_scale(pending_color[0]);
            case 'implicit.then': return make_scale(pending_color[1]);
            case 'executor': return 'black';
            case 'normal.then resolve': return make_scale(resolve_color[5]);
            case 'auto.then resolve': return make_scale(resolve_color[3]);
            case 'implicit.then resolve': return make_scale(resolve_color[1]);
            case 'wrapping Promise resolve': return make_scale(resolve_color[2]);
          }
          function make_scale(color){
            return [[0, 'white'], [1, color]];
          }
        })()
      },
      text: (function () {
        switch(line.type){
          case 'normal.then': case 'normal.then resolve': return '.then'
          case 'auto.then': case 'auto.then resolve': return '.then'
          case 'await group': return 'grouping';
          case 'implicit.then': case 'implicit.then resolve': return '.then<implicit>'
          case 'executor': return 'executor';
          case 'wrapping Promise resolve': return 'wrapping Promise resolve';
        }
      })(),
      name: (function () {
        switch(line.type){
          case 'normal.then': case 'normal.then resolve': return '.then'
          case 'auto.then': case 'auto.then resolve': return '.then'
          case 'await group': return 'grouping';
          case 'implicit.then': case 'implicit.then resolve': return '.then<implicit>'
          case 'executor': return 'executor';
          case 'wrapping Promise resolve': return 'wrapping Promise resolve';
        }
      })(),
      // text: (line.create)? 'create' : 'resolve'
    });
  });

  return {name: time, data: frame};

}

// function eid_family (nodes) {
//   for(var parent of nodes){
//     var children = nodes.filter(n => n.eid===parent.id);
//     console.log('eid '+parent.id+': '+children.length);
//     var color = random_color();
//     var opacity = 0.1;
//     var name = `execute id : ${parent.id}`;
//     children_data (children, parent, color, opacity, name);
//   }
// }
//
// function tid_family (nodes) {
//   for(var parent of nodes){
//     var children = nodes.filter(n => n.tid===parent.id);
//     console.log('tid '+parent.id+': '+children.length);
//     var color = random_color();
//     var opacity = 0.1;
//     var name = `trigger id : ${parent.id}`;
//     children_data (children, parent, color, opacity, name);
//   }
// }
//
// function children_data (children, parent, color, opacity, name) {
//   if(children.length>=3){
//     push_mesh_data(children.concat(parent), {
//       alphahull: 0,
//       opacity: opacity,
//       color: color,
//       name: name
//     });
//   }else if(children.length==2){
//     push_triangle_data(children.concat(parent), {
//       opacity: opacity,
//       color: color,
//       name: name
//     });
//   }
// }
//
// function random_color () {
//   var color = "#";
//   for(var i=0;i<6;i++) {
//     color += "0123456789abcdef"[16 * Math.random() | 0]
//   }
//   return color
// }
//
//
// function push_node_data (data, nodes, attr) {
//   data.unshift({
//     x: nodes.map(n => n.x),
//     y: nodes.map(n => n.y),
//     z: nodes.map(n => n.z),
//     mode: 'markers+text', //点のみのモード、他にlines+markersもあるっぽい
//     type: 'scatter3d', //3Dの離散グラフに
//     marker: attr.marker,
//     // text: ['id', 'execute id', 'trigger id'],
//     // hoverinfo: "text",
//     text: nodes.map(n => 'id: '+n.id),
//     name: attr.name
//   });
// }
//
// function push_mesh_data (nodes, attr) {
//   data.push({
//     x: nodes.map(n => n.x),
//     y: nodes.map(n => n.y),
//     z: nodes.map(n => n.z),
//     alphahull: attr.alphahull, //よくわからん
//     opacity: attr.opacity,
//     type: 'mesh3d',
//     color: attr.color,
//     name: attr.name
//   });
// }
//
// function push_triangle_data (nodes, attr) {
//   data.push({
//     x: nodes.map(n => n.x),
//     y: nodes.map(n => n.y),
//     z: nodes.map(n => n.z),
//     i: ["0", "0", "0"],
//     j: ["1", "1", "1"],
//     k: ["2", "2", "2"],
//     opacity: attr.opacity,
//     type: 'mesh3d',
//     surfacecolor: attr.color,
//     name: attr.name
//   });
//
//   // data.push({
//   //   x: nodes.map(n => n.x),
//   //   y: nodes.map(n => n.y),
//   //   z: nodes.map(n => n.z),
//   //   mode: 'none',
//   //   type: 'scatter3d', //3Dの離散グラフに
//   //   surfaceaxis: 1,
//   //   surfacecolor: attr.color,
//   //   opacity: attr.opacity,
//   //   name: attr.name
//   // });
// }
//
// function push_surface_data (nodes, attr) {
//   data.push({
//     x: nodes.map(n => n.x),
//     y: nodes.map(n => n.y),
//     z: nodes.map(n => n.z),
//     opacity: attr.opacity,
//     type: 'surface',
//     showscale: false,
//     surfacecolor: attr.color,
//     name: attr.name
//   });
// }
//
// function push_line_data (n1, n2, attr) {
//   data.push({
//     x: [n1.x, n2.x],
//     y: [n1.y, n2.y],
//     z: [n1.z, n2.z],
//     mode: 'lines',
//     type: 'scatter3d', //3Dの離散グラフに
//     visible: attr.visible,
//     legendgroup: attr.group,
//     line: {
//       width: attr.width,
//       dash: attr.dash,
//       color: [100, 0],
//       colorscale: attr.colorscale,
//       cmin: 20,
//       cmax: 50
//     },
//     name: attr.name
//   });
// }
