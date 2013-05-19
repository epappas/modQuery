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
	.update("beers_mirror") //
	.set("name","fooBar1") //
	.filterBy("beers_mirror", "id").in([1,2]) //
	.execute(function(rows, err, sql) {
		if(err){
			// if error, show what the heck was executed
			console.log(sql);
			console.log(err);
		}
		console.log(sql);
	});