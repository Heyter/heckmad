function(context, args)
{
  var lib = #fs.scripts.lib()
  var solvers = {
    "con_spec": con_spec,
    "magnara": magnara,
    "glock": glock,
    "acct_nt": acct_nt,
  }

  var t = args.t || args.target

  var magnara_dictionary  // will be loaded & cached when needed
  var sofar = {}
  var response = call(sofar)
  var seen_types = new Set()

  while (can_continue()) {
    let type = get_type()
    if (type == "success") return {ok:true}
    if (type == "failure" || !(type in solvers) || type in seen_types)
      return {ok:false, msg:[sofar, response]}

    seen_types.add(type)
    solvers[type]()
  }

  return {ok:false, msg:"Ran out of time. sofar = " + JSON.stringify(sofar)}

  function can_continue() {
    return lib.can_continue_execution(500)
  }

  function last(list) {
    return list[list.length-1]
  }

  function call() {
    let resp = t.call(sofar)
    try {
      resp = resp.msg || resp
    } catch(e) {}

    if (typeof(resp) != "string") {
      resp = JSON.stringify(resp)
    }
    response = resp.replace(/`[0-9A-Za-z]([^`\n]+)`/g, '$1')
  }

  function get_type() {
    let lowercase = response.toLowerCase()
    for (let maybe_type of Object.keys(solvers)) {
      if (lowercase.includes(maybe_type) && !(maybe_type in seen_types)) {
        return maybe_type
      }
    }

    // if (response.includes("con_spec") && !("con_spec" in seen_types)) {
    //   return "con_spec"
    // }
    // if (response.includes("magnara")) {
    //   return "magnara"
    // }
    // if (response.includes("sn_w_glock")) {
    //   return "glock"
    // }
    // if (response.includes("acct_nt")) {
    //   return "acct_nt"
    // }

    return "failure"
  }

  function con_spec() {
    sofar["CON_SPEC"] = 1
    call()

    let letters = response.split("\n")[0].split("")
    let charCodes = letters.map(l => l.charCodeAt(0))
    let deltas = []
    for (let i = 1; i < charCodes.length; i++) {
      let delta = charCodes[i] - charCodes[i-1]
      if (delta < 0) delta += 26
      deltas.push(delta)
    }

    let Z = "Z".charCodeAt(0)
    let answerCode = []

    let currCode = charCodes[charCodes.length-1]
    for (let i = 0; i < 3; i++) {
      let nextCode = currCode + deltas[i]
      if (nextCode > Z) nextCode -= 26
      answerCode.push(nextCode)
      currCode = nextCode
    }
    let answer = answerCode.map(c => String.fromCharCode(c))
    sofar["CON_SPEC"] = answer
    call()
  }

  function magnara() {
    if (!magnara_dictionary) {
      magnara_dictionary = {}
      let query_result = #db.f({type:"magnara"})
      query_result.forEach(function(result) {
        magnara_dictionary[result.sorted] = result.answer
      })
    }

    sofar["magnara"] = 1
    call()

    let jumble = last(last(response.split("\n")).split(" "))
    let sorted = jumble.split("").sort().join("")
    if (sorted in magnara_dictionary) {
      sofar["magnara"] = magnara_dictionary[sorted]
      call()
      return
    }

    // we don't know the answer yet. try some permutations!
    // copied pemute generator from https://stackoverflow.com/a/37580979
    function* permute(permutation) {
      let length = permutation.length,
          c = Array(length).fill(0),
          i = 1, k, p;

      yield permutation.slice();
      while (i < length) {
        if (c[i] < i) {
          k = i % 2 && c[i];
          p = permutation[i];
          permutation[i] = permutation[k];
          permutation[k] = p;
          ++c[i];
          i = 1;
          yield permutation.slice();
        } else {
          c[i] = 0;
          ++i;
        }
      }
    }

    for (let guess of permute(sorted.split("")).join("")) {
      if (!can_continue()) return
      sofar["magnara"] = guess
      call()
      if (response.includes("magnara")) {
        // incorrect?
        continue
      } else {
        // correct?
        #db.i({type:"magnara", sorted:sorted, answer:guess})
        return
      }
    }
  }

  function glock() {}

  function acct_nt() {}
}
