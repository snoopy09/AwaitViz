function wait (time) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve();
    }, time);
  });
}
async function asyncTask(){
  await wait(1);
  console.log("A");
}
asyncTask();
console.log("B");
