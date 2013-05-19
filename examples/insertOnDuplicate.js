var modQ = new require("../commons/modQuery.js");

var modQuery = new modQ({
	dbArgs: {
		host              : "localhost",
		user              : "bartender",
		password          : "beerIsAwesome",
		database          : "my_pub"
	}
});

modQuery.newModQuery() //
	.insertInto("beers_mirror") //
	.from("beers") //
	.select(["id", "name", "abv"]) //
	.filterBy("beers", "id").in([1,2,3,4]) //
	.limit(1, 10) //
	.onDuplicate() //
	.set("name","fooBar") //
	.execute(function(rows, err, sql) {
		if(err){
			// if error, show what the heck was executed
			console.log(sql);
			console.log(err);
		}
		console.log(sql);
	});