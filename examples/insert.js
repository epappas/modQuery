var modQ = new require("../commons/modQuery.js");

var modQuery = new modQ({
	dbArgs: {
		host              : "localhost",
		user              : "bartender",
		password          : "beerIsAwesome",
		database          : "my_pub"
	}
});

modQuery.newModQuery()
	.insertInto("beers")
	.insert("name", "test Beer")
	.insert("abv", 5.7)
	.addParallel() // other row
	.insertInto("beers")
	.insert("name", "best Beer")
	.insert("abv", 9)
	.execute(function(rows, err, sql) {
		if(err){
			// if error, show what the heck was executed
			console.log(sql);
			console.log(err);
		}
		console.log(sql);
	});