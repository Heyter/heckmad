function(context, args)
{
  var started_ms = (new Date()).getTime()
  function log(str) {
    return #D("`F[" + ((new Date()).getTime() - started_ms) + "]` "+str)
  }

  var lib = #fs.scripts.lib()
  var solvers = {
    "con_spec": con_spec,
    "magnara": magnara,
    "glock": glock,
    "acct_nt": acct_nt,
  }

  var t = args.t || args.target
  log("")
  log("`Wtarget: "+t.name+"`")
  var alt = args.alt || "stegosaurus"

  let con_spec_wolf = function(c, a) {
    let count = 0
    for (let letter of args.s) if (letter == args.d) count++
    return count
  }
  var data = {
    CON_SPEC: {call: con_spec_wolf},
    sn_w_glock: 1,
    acct_nt: 0,
    magnara: "okay",
  }
  var guesses_tried = {"acct_nt": new Set([0]), "magnara": new Set()}

  let balance = #hs.accts.balance()
  if (balance) #ms.accts.xfer_gc_to({to: alt, amount: balance})

  var prev_response
  var response

  call()
  while (can_continue()) {
    let type = get_type()
    log("type = " + type)
    if (type == "success") return {ok:true}
    if (type == "failure" || !(type in solvers)) {
      return {ok:false, msg:[data, response]}
    }

    solvers[type]()

    if (response == prev_response) {
      log("Failed to make progress.")
      return {ok:false, msg:"Failed to make progress."}
    }
  }
  log("`AOUT OF TIME!`")
  return {ok:false, msg:"Ran out of time."}

  function can_continue() {
    return lib.can_continue_execution(500)
  }

  function last(list) {
    return list[list.length-1]
  }

  function call() {
    let attempt_str = data.acct_nt
    log(JSON.stringify(data))
    prev_response = response
    let resp = t.call(data)
    try {
      resp = resp.msg || resp
    } catch(e) {}

    if (typeof(resp) != "string") {
      resp = JSON.stringify(resp)
    }
    response = resp.replace(/`[0-9A-Za-z]([^`\n]+)`/g, '$1')
    log(response)
  }

  function get_type() {
    let parse_map = {
      // Need to know the total earned on transactions without memos between 180521.0207 and 180521.0241

      "GC between": "acct_nt",
      "total spent": "acct_nt",
      "total earned": "acct_nt",
      "large deposit": "acct_nt",
      "large withdrawal": "acct_nt",
      "Need to know": "acct_nt",
      "three letters": "con_spec",
      "Connection terminated.": "success",
      "recinroct": "magnara",
      "balance": "glock",
      "of a beast": "glock",
    }

    for (let sign of Object.keys(parse_map))
      if (response.includes(sign))
        return parse_map[sign]

    return "failure"
  }

  function guess(key, val) {
    if (guesses_tried[key].has(val)) return false
    guesses_tried[key].add(val)

    data[key] = val
    call()
    if (response.substr(0,10) != prev_response.substr(0,10)) {
      // log("This looks like a correct guess because \n\n`R" + response + "`\n != \n`D" + prev_response + "`\n\n")
      return true
    }
    return false
  }

  function con_spec() {
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
    let answer = answerCode.map(c => String.fromCharCode(c)).join("")
    data["CON_SPEC"] = answer
    call()
  }

  function magnara() {
    let jumble = last(last(response.split("\n")).split(" "))
    let sorted = jumble.split("").sort().join("")
    let query_results = #db.f({_id:"magnara~"+sorted}).array()
    // log(query_results)

    if (query_results.length) {
      data["magnara"] = query_results[0].answer
      call()
      return
    }

    // we don't know the answer yet. try some permutations!
    // copied pemute generator from https://stackoverflow.com/a/37580979
    function* permute(list) {
      let length = list.length,
          c = Array(length).fill(0),
          i = 1, k, p;

      yield list.slice();
      while (i < length) {
        if (c[i] < i) {
          k = i % 2 && c[i];
          p = list[i];
          list[i] = list[k];
          list[k] = p;
          ++c[i];
          i = 1;
          yield list.slice();
        } else {
          c[i] = 0;
          ++i;
        }
      }
    }

    for (let permutation of permute(jumble.split(""))) {
      if (!can_continue()) return
      let to_guess = permutation.join("")
      data["magnara"] = to_guess
      call()
      if (response == prev_response) {
        continue
      } else {
        #db.i({_id:"magnara~"+sorted, answer:to_guess})
        return
      }
    }
  }

  function glock() {
    let glock_map = {
      "secret": 7,
      "special": 38,
      "elite": 1337,
      "hunter": 3006,
      "monolithic": 2001,
      "magician": 1089,
      "beast": 666,
      "meaning": 42,
      "secure": 443,
    }
    let amount
    for (let key of Object.keys(glock_map)) {
      if (response.includes(key)) {
        amount = glock_map[key]
        break
      }
    }
    if (amount == undefined) {
      response = "failed glock"
      return
    }

    #fs.stegosaurus.give({amount: amount})
    call()
  }

  function acct_nt() {
    let trans_args = {count: 50}
    if (response.includes("receive")) trans_args["to"] = context.caller
    if (response.includes("withdraw")) trans_args["from"] = context.caller

    let transactions = #hs.accts.transactions(trans_args)

    if (response.includes("near")) {
      acct_nt_near(transactions)
    } else {
      let possible_types = [[1,1], [1,-1], [-1, 1], [1, 0], [0, 1]]
      possible_types = lib.shuffle(possible_types)

      for (let i = 0; i < possible_types.length; i++) {
        guess("acct_nt", 0)
        if (acct_nt_between(transactions, possible_types[i][0], possible_types[i][1])) {
          return
        }
      }
    }
  }

  function acct_nt_between(transactions, in_times, out_times) {
    log("`Ytrying with " + in_times + " and " + out_times+"`")
    let skip_memos = !!(/without memo/.exec(response))

    let match = /([0-9]+\.[0-9]+) and ([0-9]+\.[0-9]+)/.exec(response)
    let start_time = match[1], end_time = match[2]
    let curr_sum = 0, sum_table = [0]

    for (let transaction of transactions) {
      if (skip_memos && transaction.memo) {
        continue
      }

      let time = lib.to_game_timestr(transaction.time)
      if (time > end_time) continue
      if (time < start_time) break

      // normaly ignore time==start_time but make an exception when start & end are the same
      if (time == start_time && start_time != end_time) break

      let curr_amount = transaction.amount

      // negate if withdrawal?
      if (transaction.sender == context.caller) {
        curr_amount *= out_times
      } else {
        curr_amount *= in_times
      }

      curr_sum += curr_amount
      sum_table.push(curr_sum)
    }

    if (start_time == end_time) {
      // TODO: optimize this case
      for (let i1 = 0; i1 < sum_table.length; i1++) {
        for (let i2 = i1 + 1; i2 < sum_table.length; i2++) {
          if (!can_continue()) return true
            let to_guess = sum_table[i2] - sum_table[i1]
            // if (to_guess in acct_nt_tried) continue
            // acct_nt_tried[to_guess] = true

            if (guess("acct_nt", to_guess)) {
              log("`Asolved acct_nt ``L" + prev_response + "``A, in=``Y"+in_times+"``A, out=``Y"+out_times+"`")
              return true
            }
        }
      }
      return false
    }


    let end_sum = last(sum_table)
    for (let start_idx = 0; start_idx < sum_table.length; start_idx++) {
      if (!can_continue()) return true
      // log("try start_idx = " + start_idx + ", sum_table[start_idx] = " + sum_table[start_idx])
      let to_guess = end_sum - sum_table[start_idx]
      // if (to_guess in acct_nt_tried) continue
      // acct_nt_tried[to_guess] = true

      if (guess("acct_nt", to_guess)) {
        log("`Asolved acct_nt ``L" + prev_response + "``A, in=``Y"+in_times+"``A, out=``Y"+out_times+"`")
        return true
      }
    }
    return false
  }
  function acct_nt_near(transactions) {
    let match = /near ([0-9]+\.[0-9]+)/.exec(response)
    let near_time = match[1]

    let start_index

    for (let i = 0; i < transactions.length; i++) {
      let transaction = transactions[i]
      let time = lib.to_game_timestr(transaction.time)
      if (time > near_time) continue
      if (guess("acct_nt", transaction.amount)) return
      start_index = i
      break
    }


    for (let d = 1; d < transactions.length; d++) {
      if (!can_continue()) return
      let lo = start_index - d
      let hi = start_index + d
      if (lo >= 0 && guess("acct_nt", transactions[lo].amount)) return
      if (hi < transactions.length && guess("acct_nt", transactions[hi].amount)) return
    }
  }
}
