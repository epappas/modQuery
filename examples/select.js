var modQ = new require("../commons/modQuery.js");

var modQuery = new modQ({
	dbArgs : {
		host    : "localhost",
		user    : "bartender",
		password: "beerIsAwesome",
		database: "my_pub"
	},
	usePool: true
});

modQuery.newModQuery()
	.select()
	.from("beers")
	.filterBy("beers", "id").equals(1)
	.execute(function (rows, err, sql) {
		if (err) {
			// if error, show what the heck was executed
			console.log(sql);
			console.log(err);
		}
		console.log(sql);
		console.log(rows);
	});