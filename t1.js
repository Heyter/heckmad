function(context, args)
{
  function crack(loc) {
    var key;
    var sofar = {};
    var vals;
    var responses = {};
    for(var tries=0;tries<10;tries++) {
      if (key && key[0] == "`") key = key.substring(2, key.length-1);
      if (!key) vals = [0];
      else if (key.includes("prime")) vals = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97];
      else if (key.includes("c00")) vals = ["red","orange","yellow","green","lime","blue","cyan","purple"];
      else if (key.includes("digit")) vals = [0,1,2,3,4,5,6,7,8,9];
      else if (key.includes("l0cket")) vals =  ["6hh8xw","cmppiq","sa23uw","tvfkyq","uphlaw","vc2c7q","xwz7ja"];
      else vals = ["open", "unlock", "release"];

      for (var v of vals) {
        if (key) sofar[key] = v;
        var response = loc.call(sofar);
        responses[JSON.stringify(sofar)] = response;
        var s;
        try{
          s = response.split(" ");
        } catch (e) {
          return response;
        }
        var m = s.indexOf("missing.");
        if (m > 0) {
          // correct, another lock
          key = s[m-2];
          break;
        } else if (s[s.length-1] == "lock.") {
          // another lock
          key = s[s.length-2];
          break;
        } else {
          if (!(s.includes("correct"))) // fully unlocked?
            return response;
        }
        // keep trying more vals
      }
    }
    return JSON.stringify(responses);
  }

  return Object.values(args).map(loc => crack(loc));
}
