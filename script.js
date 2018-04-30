function(context, args) // loc:loc
{
	var lib = #fs.scripts.lib();

	if (!args || !args.loc) {
		return "Specify a loc";
	}
	// var keys = ["c001", "c002", "c003", "ez_21", "ez_35", "digit"];

	var loc = args.loc;
	var data = {};
	var response = loc.call(data);
	return response.includes("ATION::: hardl");
	while(true) {
		var key = determine_key(response);
		var sol = solve_key(loc, data, key);
		if (sol.done) {
			return {}
		}

		data[key] = sol.value;
		response = sol.response;
	}

	// var data = {};
	// var key = null;
	// if (key == null) {
	// 	if(response.includes("c003")) {

	// 	}
	// }

	// function colors(key) {

	// }

	// var locks = {
	// 	"c00": colors,
	// }
	// if (response.includes("c003")) {
	// 	colors("c003");
	// }
	// // l.log("log")
	// // // return l.get_security_level_name(l);
	// return {ok:true}
}
