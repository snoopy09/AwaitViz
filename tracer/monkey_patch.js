(function () {
    // .then を置き換える
    var old_then = Promise.prototype.then;
    Promise.prototype.then = function (on_resolved, on_rejected) {
        //console.log (".then called!");
        var trace = __get_trace();

        if(on_resolved != undefined && on_resolved.toString() == 'function () { [native code] }') var caller = 'auto';
        else var caller = 'user';

        __logs.push({
          logtype: 'monkey',
          time: __get_time(),
          type: 'then',
          caller: caller,
          line: trace.line,
          column: trace.column
        });
        var return_value = old_then.apply (this, arguments);
        return return_value;
    }

    // Promise自体を置き換える
    var old_Promise = Promise;
    Promise = function (arguments) {
      //console.log ("Promise created!");
      var trace = __get_trace();

      if(arguments != undefined && arguments.toString() === 'function () { [native code] }') var caller = 'auto';
      else var caller = 'user';

      __logs.push({
        logtype: 'monkey',
        time: __get_time(),
        type: 'Promise',
        caller: caller,
        line: trace.line,
        column: trace.column
      });
      var self = new old_Promise (arguments);
      return self;
    }
})();
