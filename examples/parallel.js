var modQ = new require("../commons/modQuery.js");

var modQuery = new modQ({
	dbArgs: {
		host              : "localhost",
		user              : "bartender",
		password          : "beerIsAwesome",
		database          : "my_pub"
	}
});

// create a massive Query
modQuery.newModQuery()// TIP: use newModQuery() to void collisions & have better connection pooling
	.from("beers") //
	.select(["name"]) //
	.filterBy("beers", "id").in([1,2,3,4]) //
	.addParallel() // parallel execution & result fetch
	//-------------------------- test regex
	.from("beers") //
	.select(['id', 'name']) //
	.filterBy("beers", "name").regex("'^[a-d]'") //
	.addParallel() // parallel execution & result fetch
	//-------------------------- test equals
	.from("beers") //
	.select(['id', 'name']) //
	.filterBy("beers", "id").equals(1) //
	.addParallel() // parallel execution & result fetch
	//-------------------------- test notEquals
	.from("beers") //
	.select(['id', 'name']) //
	.filterBy("beers", "id").notEquals(1) //
	.limit(10, 20)
	.addParallel() // parallel execution & result fetch
	//-------------------------- test contains
	.from("beers") //
	.select(['id', 'name']) //
	.filterBy("beers", "name").contains("old") //
	.limit(1, 10)
	.addParallel() // parallel execution & result fetch
	//-------------------------- test greaterThan
	.from("beers") //
	.select(['id', 'name']) //
	.filterBy("beers", "abv").greaterThan(5) //
	.limit(1, 10)
	.addParallel() // parallel execution & result fetch
	//-------------------------- Build and execute all queries in parallel
	.execute(function(rows, err, sql) {
		if(err){
			// if error, show what the heck was executed
			console.log(sql);
			console.log(err);
		}
		console.log(rows);
	});