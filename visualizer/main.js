//実行部分でけでなく呼び出し元をハイライトしても可

const TREEFILEPATH = './data/tree.json';
const LOGFILEPATH = './data/log.json';
const CODEFILEPATH = './data/code.txt';
const FUNCNAMEFILEPATH = './data/funcname_table.json';

const PENDING = 0;
const RESOLVED = 1;
const REJECTED = 2;
const RESOLVE = 3;
const REJECT = 4;


//let code, logs;
Promise.all([read_txt(CODEFILEPATH), read_json(LOGFILEPATH), read_json(FUNCNAMEFILEPATH)])
.then(array => {
  var code = array[0];
  var logs = array[1].list;
  var funcname_table = array[2].list;

  display_line(code);
  change_text(code);
  //plot_sample();
  var bar = create_bar(logs, funcname_table, code);
  var plot = create_plot(logs, bar.func_list, code);
  display_plot(plot, code);
  display_bar(bar, code);
  //display_plot();
});

function read_txt (filename) {
  return new Promise(resolve => {
    Plotly.d3.text(filename, "text/plain", function (data) {
      resolve(data);
    });
  })
}
function read_json (filename) {
  return new Promise(resolve => {
    Plotly.d3.json(filename, function (data) {
      resolve(data);
    });
  })
}
