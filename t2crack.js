function(context, args)
{
  function crack(loc) {
    var resp = loc.call({CON_SPEC:1})
    try {
      resp = resp.msg || resp
    } catch(e) {}

    if (!resp.includes("next three")) return JSON.stringify(resp);
    var letters = resp.split("\n")[0].split("")
    var charCodes = letters.map(l => l.charCodeAt(0))
    var deltas = []
    for (var i = 1; i < charCodes.length; i++) {
      var delta = charCodes[i] - charCodes[i-1]
      if (delta < 0) delta += 26
      deltas.push(delta)
    }

    var Z = "Z".charCodeAt(0)
    var answerCode = []

    var currCode = charCodes[charCodes.length-1];
    for (var i = 0; i < 3; i++) {
      var nextCode = currCode + deltas[i]
      if (nextCode > Z) nextCode -= 26
      answerCode.push(nextCode)
      currCode = nextCode
    }
    var answer = answerCode.map(c => String.fromCharCode(c))
    return answer+">>>"+JSON.stringify(loc.call({CON_SPEC:answer}))
  }

  return Object.values(args).map(loc => loc.name + ":" + crack(loc));
}
