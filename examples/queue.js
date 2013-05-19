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
	.filterBy("beers", "id").in([1,2,3,4,5,6]) //
	.limit(0, 10) //
	.onDuplicate() //
	.set("name","fooBar") //
	.inAddition() // enQueue query
	.update("beers_mirror") //
	.set("name","fooBar1") //
	.filterBy("beers_mirror", "id").in([1,2]) //
	.inAddition() // enQueue query
	.from("beers_mirror")// a SELECT * query
	// Execute all as they have been piped
	.execute(function(rows, err, sql) {
		if(err){
			// if error, show what the heck was executed
			console.log(sql);
			console.log(err);
		}
		console.log(sql);
	});