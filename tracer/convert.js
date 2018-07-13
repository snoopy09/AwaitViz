const esprima = require('esprima');
const estraverse = require('estraverse');
const escodegen = require('escodegen');
let funcname_table = [{name: 'main program', id: 0}];
let func_id=1;


function print_ast (ast) {
  console.log(JSON.stringify(ast, null, ' '));
}
// コードを変換
function convert (code, addcode) {
  let ast = esprima.parse(code, {loc: true, range: true});
  //print_ast(esprima.parse(code));

  estraverse.traverse(ast, {
    enter: function (node, parent) {
      //new Promiseのみ
      if(node.type === "NewExpression" && node.callee.name === "Promise"){
        // 子ノードが親ノードのどのプロパティに属しているか調べる
        for(key in parent){
          if(parent[key] === node) var keep_key = key;
        }
        // loc, rangeを文字列に変換
        var loc = node.loc;
        var loc_arg = `${loc.start.line},${loc.start.column}`;
        var range = node.range;
        var range_arg = `${range[0]},${range[1]}`;
        var promise_func = esprima.parse(`__promise("", "");`).body[0];
        promise_func.expression.arguments[0].value = loc_arg;
        promise_func.expression.arguments[1].value = range_arg;
        var promise_wrap_func = esprima.parse(`__promise_wrap();`).body[0];
        promise_wrap_func.expression.arguments.push(promise_func.expression);
        promise_wrap_func.expression.arguments.push(node);

        // nodeの部分を__resumeの呼び出しに置き換え
        parent[keep_key] = promise_wrap_func.expression;
        parent[keep_key].loc = node.loc;
        parent[keep_key].range = node.range;

      }
    }
  });


  estraverse.traverse(ast, {
    enter: function (node, parent) {
      //function foo () {}のみ、最初と終わりに呼ばれる
      if(node.type === "FunctionDeclaration" || node.type === "FunctionExpression"){
        var loc = node.loc;
        var range = [node.body.body[0].range[0], node.body.body[node.body.body.length-1].range[1]];
        var dif_range = node.range;
        // var point = node.range[0];
        var is_async = node.async;
        if(node.id === null) {
          var func_name = ''+`func@${loc.start.line}:${loc.start.column}`;
          // node.id = {type: "Identifier", name: 'anonimous'+func_id};
          // console.log(node);
        }else {
          var func_name = node.id.name;
        }

        var func = esprima.parse(`__func_begin("", "", "", "", "", "");`).body[0];
        func.expression.arguments[0].value = `${loc.start.line},${loc.start.column}`;
        func.expression.arguments[1].value = `${range[0]},${range[1]}`;
        func.expression.arguments[2].value = `${dif_range[0]},${dif_range[1]}`;
        // func.expression.arguments[2].value = point;
        func.expression.arguments[3].value = func_id;
        func.expression.arguments[4].value = func_name;
        func.expression.arguments[5].value = is_async;
        node.body.body.unshift(func);

        var func = esprima.parse(`__func_end(undefined, "", "", "", "", "");`).body[0];
        func.expression.arguments[1].value = `${loc.start.line},${loc.start.column}`;
        func.expression.arguments[2].value = `${range[0]},${range[1]}`;
        func.expression.arguments[3].value = func_id;
        func.expression.arguments[4].value = func_name;
        func.expression.arguments[5].value = is_async;
        node.body.body.push(func);

        estraverse.traverse(node.body, {
          enter: function (node, parent) {
            if(node.type === "ReturnStatement"){
              var func = esprima.parse(`__func_end("", "", "", "", "");`).body[0];
              func.expression.arguments[0].value = `${loc.start.line},${loc.start.column}`;
              func.expression.arguments[1].value = `${range[0]},${range[1]}`;
              func.expression.arguments[2].value = func_id;
              func.expression.arguments[3].value = func_name;
              func.expression.arguments[4].value = is_async;
              func.expression.arguments.unshift(node.argument);
              node.argument = func.expression;
            }
          }
        });

        // await式部分
        estraverse.traverse(node.body, {
          enter: function (node, parent) {
            // thisの扱いはこれで問題ないのか？
            if(node.type === "FunctionDeclaration" || node.type === "FunctionExpression") this.skip();
            if(node.type === 'AwaitExpression'){
              // 子ノードが親ノードのどのプロパティに属しているか調べる
              for(key in parent){
                if(parent[key] === node) var keep_key = key;
              }
              // loc, rangeを文字列に変換
              // argumentで取らないとvalueのとこでおかしくなるはず
              var loc = node.loc;
              var loc_arg = `${loc.start.line},${loc.start.column}`;
              var range = node.range;
              var range_arg = `${range[0]},${range[1]}`;

              // // awaitがついた式の評価開始のログを取る関数
              // var eval_func = esprima.parse(`__eval("", "", "");`).body[0];
              // eval_func.expression.arguments[0].value = loc_arg;
              // eval_func.expression.arguments[1].value = range_arg;
              // eval_func.expression.arguments[2].value = "eval promise";

              // 第一引数は__evalの呼び出し、第二引数はawaitがつけられた式
              var await_func = esprima.parse(`__await("", "", "", "", "");`).body[0];
              await_func.expression.arguments[0].value = loc_arg;
              await_func.expression.arguments[1].value = range_arg;
              await_func.expression.arguments[2].value = func_id;
              await_func.expression.arguments[3].value = func_name;
              await_func.expression.arguments[4].value = is_async;
              await_func.expression.arguments.unshift(node.argument);
              //await_func.expression.arguments.unshift(eval_func.expression);
              node.argument = await_func.expression;

              // 復帰のタイミングを取る関数、第一引数はawait式
              var resume_func = esprima.parse(`__resume("", "", "", "", "");`).body[0];
              resume_func.expression.arguments[0].value = loc_arg;
              resume_func.expression.arguments[1].value = range_arg;
              resume_func.expression.arguments[2].value = func_id;
              resume_func.expression.arguments[3].value = func_name;
              resume_func.expression.arguments[4].value = is_async;
              resume_func.expression.arguments.unshift(node);

              // nodeの部分を__resumeの呼び出しに置き換え
              parent[keep_key] = resume_func.expression;
              parent[keep_key].loc = node.loc;
              parent[keep_key].range = node.range;
            }
          }
        });

        funcname_table.push({name: func_name, id: func_id++});
      }
    }
  });

  estraverse.traverse(ast, {
    // プログラムの頭にコードを挿入
    leave: function (node, parent) {
      var loc = node.loc;
      var range = node.range;
      if(node.type === 'Program') {
        var func = esprima.parse(`__func_begin("", "", "", "", "", "");`).body[0];
        func.expression.arguments[0].value = `${loc.start.line},${loc.start.column}`;
        func.expression.arguments[1].value = `${range[0]},${range[1]}`;
        func.expression.arguments[2].value = `${range[0]},${range[1]}`;
        // func.expression.arguments[2].value = `${range[0]}`;
        func.expression.arguments[3].value = 0;
        func.expression.arguments[4].value = 'main program';
        func.expression.arguments[5].value = false;
        node.body.unshift(func);
        var func = esprima.parse(`__func_end(undefined, "", "", "", "", "");`).body[0];
        func.expression.arguments[1].value = `${loc.start.line},${loc.start.column}`;
        func.expression.arguments[2].value = `${range[0]},${range[1]}`;
        func.expression.arguments[3].value = 0;
        func.expression.arguments[4].value = 'main program';
        func.expression.arguments[5].value = false;
        node.body.push(func);

        var bodies = esprima.parse(addcode).body;
        node.body = bodies.concat(node.body);
      }
    }
  });
  //console.log(escodegen.generate(ast));
  return {
    funcname: make_json(funcname_table),
    code: escodegen.generate(ast)
  }
}

function make_json (table) {
  function make_text (obj) {
    return `{
  "name": "${obj.name}",
  "id": "${obj.id}"
}`
  }
  return `{"list": [${funcname_table.map(make_text).join(',\n')}]}`
}

module.exports = convert;
