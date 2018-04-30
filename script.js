function(context, args)
{
	var lib = #fs.scripts.lib();

	if (!args || !args.loc) {
		return "Specify a loc";
	}

	var loc = args.loc;
	var data = {};
	var response = loc.call(data);
	if (response.msg.includes("script doesn't exist")) {
		return {ok: false, msg: response.msg};
	}

	while(true) {
		var key = determine_key(response);
		var sol = solve_key(loc, data, key);
		if (sol.solved) {
			return {ok: true}
		}
		if (sol.failed) {
			return {ok: false}
		}

		data[key] = sol.value;
		response = sol.response;
	}

	function determine_key(response) {
		var uppercase = response.toUpperCase();
		// Denied access by HALPERYON SYSTEMS EZ_21 lock.
		ez_index = uppercase.indexOf("EZ_");
		if (ez_index > 0) {
			return {
				label: response.substr(ez_index, 5),
				type: "EZ"
			}
		}

		// Denied access by CORE c003 lock.
		c00_index = uppercase.indexOf("C00");
		if (c00_index > 0) {
			return {
				label: response.substr(c00_index, 5),
				type: "C00"
			}
		}
	}

	function solve_key() {
		return {
			solved: true
		}
	}
}
