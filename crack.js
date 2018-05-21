function(context, args)
{
  function log(str) {
    return #D(str)
  }


  var lib = #fs.scripts.lib()
  var solvers = {
    "con_spec": con_spec,
    "magnara": magnara,
    "glock": glock,
    "acct_nt": acct_nt,
  }

  var t = args.t || args.target
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
      log("not in solvers")
      return log({ok:false, msg:[data, response]})
    }

    // try {
    solvers[type]()
    // } catch (e) {

    // }

    if (response == prev_response) {
      return log({ok:false, msg:"Failed to make progress."})
    }
  }

  return log({ok:false, msg:"Ran out of time. " + JSON.stringify(data) + "\n" + response})

  function can_continue() {
    return lib.can_continue_execution(800)
  }

  function last(list) {
    return list[list.length-1]
  }

  function call() {
    let attempt_str = data.acct_nt
    log(data)
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
      "GC between": "acct_nt",
      "total spent": "acct_nt",
      "large deposit": "acct_nt",
      "large withdrawal": "acct_nt",
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
    data[key] = val
    call()
    return response != prev_response
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

    // log("amount:"+amount)
    #fs.stegosaurus.give({amount: amount})
    call()
  }

  function acct_nt() {
    let trans_args = {count: 30}
    if (response.includes("receive")) trans_args["to"] = context.caller
    if (response.includes("withdraw")) trans_args["from"] = context.caller

    let transactions = #hs.accts.transactions(trans_args)

    log("near/between?", response.includes("near"))
    if (response.includes("near")) acct_nt_near(transactions)
    else acct_nt_between(transactions)
  }
  function acct_nt_between(transactions) {
    log("acct_nt_between")
    let skip_memos = !!(/without memo/.exec(response))
    let do_inverse = !!(/spent/.exec(response))
    let net = !!(/ net /.exec(response))

    let match = /([0-9]+\.[0-9]+) and ([0-9]+\.[0-9]+)/.exec(response)
    let start_time = match[1], end_time = match[2]
    let curr_sum = 0, sum_table = [0]

    // let start_idx_hi = 0, end_idx
    // filter, create sum table, find possibles
    // let filtered_trans = []
    for (let transaction of transactions) {
      // log(transaction)
      if (skip_memos && transaction.memo) {
        // log("skip memo");
        continue
      }

      let time = lib.to_game_timestr(transaction.time)
      // if (time > end_time) { log("too early"); continue }
      // if (start_idx_hi == 0) {
      //   start_idx_hi = sum_table.length
      // }
      // if (time == end_time) {
        // log("exact end time")
      //   let curr_idx = filtered_trans.length
      //   start_idx_hi = curr_idx
      // }
      // if (time <= start_time) { log("too late"); break }

      let curr_amount = transaction.amount
      // negate if withdrawal
      if (net && transaction.sender == context.caller) curr_amount *= -1

      curr_sum += curr_amount
      sum_table.push(curr_sum)
      // filtered_trans.push(transaction)
    }
    // log("sum_table:" + JSON.stringify(sum_table))

    let end_sum = last(sum_table)
    // log("end sum = "+end_sum)
    for (let start_idx = 0; start_idx < sum_table.length; start_idx++) {
      if (!can_continue()) return
      log("try start_idx = " + start_idx + ", sum_table[start_idx] = " + sum_table[start_idx])
      let to_guess = end_sum - sum_table[start_idx]
      // data["acct_nt"] = guess
      // call()
      // if (response != prev_response) return

      if (guess("acct_nt", to_guess)) return
      if (guess("acct_nt", -1 * to_guess)) return
      // data["acct_nt"] = -1 * guess
      // call()
      // if (response != prev_response) return
    }
  }
  function acct_nt_near(transactions) {
    log("acct_nt_near")
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
      let lo = i - d
      let hi = i + d
      if (lo >= 0 && guess("acct_nt", transactions[lo].amount)) return
      if (hi < transactions.length && guess("acct_nt", transactions[hi].amount)) return
    }

    // data["acct_nt"] = total
    // call()
  }
}
