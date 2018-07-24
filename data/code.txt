const fs = require('fs');
(async function () {
  var response, filename;
  response = await readFile ("input_sample/a.txt");
  filename = getFilename (response);
  response = await readFile (filename);
  filename = getFilename (response);
  response = await readFile (filename);
  show(response);
})();
function readFile (filename) {
  return new Promise (function (resolve) {
    fs.readFile(filename, 'utf-8', function (err, text) {
      resolve(text);
    });
  });
}
function getFilename (name) {
  return "input_sample/" + name.split('\n')[0];
}
function show (text) {
  console.log(text);
}
