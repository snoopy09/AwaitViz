
// 行数を表示
function display_line(code){
  var element = document.getElementById("line_number");
  var line_number = "";
  // var aline_num = Math.floor(Math.log10(code.split('\n').length))+1, aline;
    for(var i=1;i<=code.split('\n').length;i++){
    // if(Math.log10(i) - Math.floor(Math.log10(i)) == 0) {
    //   aline_num -= 1;
    //   aline = "&ensp;".repeat(aline_num);
    // }
    line_number += i+'&ensp;&ensp;'+'<br>';
  }
  element.innerHTML = '<p>'+line_number+'</p>';
}

// 文字列の途中への挿入を行う関数
function str_insert(str, idx, val){
  return str.slice(0, idx) + val + str.slice(idx);
};
function change_text(text){
  var element = document.getElementById("code_text");
  element.innerHTML = replace(text);

  // htmlで表示できない文字の置き換えを行う関数
  function replace(text){
    var before, after = text;
    // 改行の置き換え
    while(before !== after) {
      before = after;
      after = before.replace('\n', '<br>');
    }
    // タブ文字の置き換え
    after = before.replace('	', '&ensp;&ensp;');
    while(before !== after) {
      before = after;
      after = before.replace('	', '&ensp;&ensp;');
    }
    // 半角スペースの置き換え
    after = before.replace(' ', '&ensp;');
    while(before !== after) {
      before = after;
      after = before.replace(' ', '&ensp;');
    }
    // spanタグのスペースを戻す
    after = before.replace('<span&ensp;', '<span ');
    while(before !== after) {
      before = after;
      after = before.replace('<span&ensp;', '<span ');
    }
    return '<p>'+after+'</p>';
  }
}


var execute = [{place: 0, text: '</span>'}, {place: 0, text: '<span class="execute">'}], execute_code = "";


function display_plot(obj, code){
  execute_code = code;
  var data = obj.data;
  console.log(data);
  var frames = obj.frames;
  console.log(frames);
  var max_x = Math.max.apply(null, obj.nodes.map(n => n.x));
  var max_y = Math.max.apply(null, obj.nodes.map(n => n.y));
  var min_x = Math.min.apply(null, obj.nodes.map(n => n.x));
  var min_y = Math.min.apply(null, obj.nodes.map(n => n.y));
  var categorys = ['NaN', 'new Promise()', '.then()', 'relaying then', 'wrapping Promise', 'continuation closure', 'async()'];
  categorys = categorys.filter(c => obj.nodes.filter(n => n.z===c).length>0);
  var ticks = [];
  for(var i=0;i<categorys.length;i++){
    ticks.push(i+1);
    // ticks.push('t'+(i+1));
  }
  // console.log(categoryarray);

  var times = frames.map(obj => obj.name);
  var sliderSteps = [];
  for (i = 0; i < times.length; i++) {
    sliderSteps.push({
      method: 'animate',
      // label: Math.floor(times[i])+'.…',
      label: times[i],
      args: [[times[i]], {
        mode: 'immediate',
        transition: {duration: 300},
        frame: {duration: 300, redraw: false},
      }]
    });
  }

  var layout = {
    autosize: true,
    // height: 600,
    // width: 400,
    margin: {
      l: 0,
      r: 0,
      // b: 0,
      // t: 100,
      // pad: 4
    },
    scene: {
      aspectratio: {
        x: 1,
        y: 1,
        z: 1
      },
      camera: {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        eye: {
          x: 1.5,
          y: 1.5,
          z: 1.5
        },
        up: {
          x: 0,
          y: 0,
          z: 0
        }
      },
      xaxis: {
        title: 'promise id',
        type: 'linear',
        range: [min_x, max_x],
        zeroline: false,
      },
      yaxis: {
        title: 'time',
        type: 'linear',
        range: [min_y, max_y],
        zeroline: false
      },
      zaxis: {
        // visible: false,
        title: '',
        // title: 'type',
        type: 'linear',
        // range: [min_z, max_z],
        zeroline: false,
        type: "category",
        categoryarray: categorys,
        tickmode: 'array',
        tickvals: categorys,
        // ticktext: ticks,
        range: [0, categorys.length-1]
      }
    },
    hovermode: 'closest',
    updatemenus: [{
      x: 0,
      y: 0,
      z: 0,
      yanchor: 'top',
      xanchor: 'left',
      showactive: false,
      direction: 'left',
      type: 'buttons',
      pad: {t: 87, r: 10},
      buttons: [{
        method: 'animate',
        args: [null, {
          mode: 'immediate',
          fromcurrent: true,
          transition: {duration: 300},
          frame: {duration: 500, redraw: false}
        }],
        label: 'Play'
      }, {
        method: 'animate',
        args: [[null], {
          mode: 'immediate',
          transition: {duration: 0},
          frame: {duration: 0, redraw: false}
        }],
        label: 'Pause'
      }]
    }],
    // Finally, add the slider and use `pad` to position it
    // nicely next to the buttons.
    sliders: [{
      pad: {l: 130, t: 55},
      currentvalue: {
        visible: true,
        prefix: 'time:',
        xanchor: 'right',
        offset: 0,
        font: {size: 15, color: '#666'}
      },
      steps: sliderSteps
    }],
    title: 'Promise Graph',
  };

  // console.log(times);
  // console.log(frames);
  Plotly.plot('plot', {
    data: data,
    layout: layout,
    frames: frames
  });
  document.getElementById('plot').on('plotly_hover', function(e){
    var point = e.points[0];
    var range = nodes.filter(n => n.time==point.y)[0].range;
    console.log(range);
    if(range != undefined && range[0]!=range[1]) {
      //色を変える
      var inserts = [].concat(execute);
      inserts.unshift({place: range[1], text: '</span>'});
      inserts.unshift({place: range[0], text: '<span class="hover_plot">'});
      inserts.sort((a, b) => (a.place < b.place)? 1: -1);
      // console.log(inserts);
      var text = code;
      inserts.forEach(obj => {
        text = str_insert(text, obj.place, obj.text);
      });
      change_text(text);
    }
  });
  document.getElementById('plot').on('plotly_unhover', function(e){
    change_text(execute_code);
  });

  document.getElementById('plot').on('plotly_sliderchange', function(e){
    //アニメーションだと文字のハイライトうまくいってないなぁ

    var time = e.step.value;
    var range = nodes.filter(n => n.time==time || n.resolvetime==time)[0].range;
    if(range != undefined) {
      //色を変える
      execute[0].place = range[1];
      execute[1].place = range[0];
      execute_code = str_insert(code, execute[0].place, execute[0].text);
      execute_code = str_insert(execute_code, execute[1].place, execute[1].text);
      change_text(execute_code);
    } else {
      execute[0].place = 0;
      execute[1].place = 0;
      execute_code = code;
      change_text(code);
    }
  });

}




function display_bar (data, code) {
  console.log(data);
  var layout = {
    // autosize: false,
    // width: 800,
    // height: 500,
    margin: {
      l: 170,
      r: 20,
    },
    barmode: 'stack',
    xaxis: data.xaxis,
    title: 'Function Execution'
  };
  Plotly.newPlot('bar', data.data, layout);

  document.getElementById('bar').on('plotly_hover', function(e){
    // console.log(e);
    var point = e.points[0];
    var range = point.data.range;
    // console.log(point.data);
    // var range = data.data.filter(obj => obj.uid==point.data.uid)[0].range;

    //色を変える
    var inserts = [].concat(execute);
    inserts.unshift({place: range[1], text: '</span>'});
    inserts.unshift({place: range[0], text: '<span class="hover_bar">'});
    inserts.sort((a, b) => (a.place < b.place)? 1: -1);
    // console.log(inserts);
    var text = code;
    inserts.forEach(obj => {
      text = str_insert(text, obj.place, obj.text);
    });
    change_text(text);
  });
  document.getElementById('bar').on('plotly_unhover', function(e){
    change_text(execute_code);
  });

  var base_tickvals = [].concat(layout.xaxis.tickvals);
  var base_ticktext = [].concat(layout.xaxis.ticktext);
  document.getElementById('plot').on('plotly_sliderchange', function(e){
    var time = e.step.value;
    // console.log(time);
    Plotly.relayout('bar', {
      'xaxis.tickvals' : base_tickvals.concat([time]),
      'xaxis.ticktext' : base_ticktext.concat(['time:' + (Math.floor(time*100)/100).toFixed(2) + '...']),
    });
  });

}
