const fs = require('fs');
const create_hook = require('./tracer/create_hook.js');
const convert = require('./tracer/convert.js');

const FILEPATH = './'+process.argv[2];
const DECFILEPATH = 'tracer/declarations.js';
const MONKEYFILEPATH = 'tracer/monkey_patch.js';
const LOGFUNCFILEPATH = 'tracer/log_func.js';
const LOGCODEFILEPATH = 'tracer/logcode.js';
const CODEFILEPATH = 'data/code.txt';
const FUNCNAMEFILEPATH = 'data/funcname_table.json';

create_hook();

const code = fs.readFileSync(FILEPATH, 'utf-8');
fs.writeFileSync(CODEFILEPATH, code);
const addcode = fs.readFileSync(DECFILEPATH, 'utf-8') + fs.readFileSync(MONKEYFILEPATH, 'utf-8') + fs.readFileSync(LOGFUNCFILEPATH, 'utf-8');
var ret = convert(code, addcode);
const logcode = ret.code;
fs.writeFileSync(LOGCODEFILEPATH, logcode);
const funcname = ret.funcname;
fs.writeFileSync(FUNCNAMEFILEPATH, funcname);
require('./'+LOGCODEFILEPATH);
