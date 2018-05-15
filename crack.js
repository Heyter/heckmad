function(context, args)
{
  var lib = #fs.scripts.lib()
  var solvers = {
    "CON_SPEC": con_spec,
    "magnara": magnara,
  }

  var t = args.t || args.target

  var sofar = {}
  var response = call(sofar)

  while (lib.can_continue_execution(1000)) {
    let type = get_type()
    if (type == "success") return {ok:true}
    if (type == "failure" || !(type in solvers)) return {ok:false}
    solvers[type]()
  }

  return {ok:false, msg:"Ran out of time. sofar = " + JSON.stringify(sofar)}

  function call() {
    let resp = t.call(sofar)
    if (typeof(resp) != "string") {
      resp = JSON.stringify(resp)
    }
    response = resp.replace(/`[0-9A-Za-z]([^`\n]+)`/g, '$1')
  }

  function get_type() {
    if (response.includes("next three")) {
      return "CON_SPEC"
    }



    return "failure"
  }
}
