function(context, args)
{
  var pub = args.public
  var members = args.members
  var order_ids_map = getOrderIds(pub, members)

  var locset = new Set()
  var loc_regex = /([a-z0-9_]+_[a-z0-9_]+\.[a-z0-9_]+_[a-z0-9_]+)/g
  for (var username of Object.keys(order_ids_map)) {
    for (var order_id of order_ids_map[username]) {
      var order_resp = members.call({username: username, action: "cust_service", order_id:order_id})
      var match;
      while (match = loc_regex.exec(order_resp)) {
        locset.add(match[1])
      }
    }
  }

  var locs = Array.from(locset.values())
  var i = 0;
  return "max.t2crack{"+locs.map(loc => (i++) + ":#s." + loc).join(",\n")+"}"

  function getUsernames(pub) {
    var corruption = /[¡¢Á¤Ã¦§¨©ª<>]/

    var c1 = pub.call({})
    try {
      var key = / with ([^:]*):/.exec(c1)[1]
    } catch(e) {
      return []
    }

    try{
      var c0 = pub.call()
      c0 = c0.split("\n")
    }catch(e){
      return []
    }

    c0 = c0[c0.length-1].split("|").map(s => s.trim())
    var blog = c0[0]

    var regexes = [
      /([a-zA-Z0-9_]*) when being asked/g,
      /([a-zA-Z0-9_]*) of project/g,
    ]
    var usernames = [];
    var blog_msg = pub.call({[key]: blog})
    for (var r of regexes) {
      var match;
      while (match = r.exec(blog_msg)) {
        usernames.push(match[1])
      }
    }
    return usernames
  }

  function getOrderIds(pub, members) {
    // returns a map from user_id to list of order_ids
    var user_set = new Set()
    for (var i = 0; i < 5; i++) {
      for (var user of getUsernames(pub)) {
        user_set.add(user)
      }
    }
    var usernames = Array.from(user_set.values())
    if (!usernames) {
      return []
    }
    var order_ids = {}

    for (var user of usernames) {
      try {
        var qrs_resp = #fs.dtr.qr({t:members, a:{"username":user, "action":"order_qrs"}})
        order_ids[user] = qrs_resp.map(qr => qr["id"])
      } catch (e) {}
    }

    return order_ids
  }
}
