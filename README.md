modQuery (v 0.5)
==========================

A module to use for MySQL queries with respect to SQL.

## What is about ##

modQuery is a module that aims to bridge your JS code with MySQL with a respect to both SQL & Javascript.
It's purpose is to wrap your SQL with extra functionality that is often needed.
It's fun.

## Why to use it ##
Because..
- You like using pure SQL but not have a unmaintainable JS code.
- You don't want flood your database with unnecessary connections & re-connections.
- You want to wrap your your Query with objects & callbacks that fit better to your JS logic.
- Your model in your JS code doesn't mirror exactly the Database Schema.
- You want a better SQL control.
- You want to have fun & you like beer.

## What to have in mind ##

- It is not a persistence framework.
- It currently supports MySQL only.
- It can be used in production but with caution.
- Don't use it if you don't like beer.

## Getting Started ##

As usual, install

	$ npm install modquery

And include the module

	var modQ = new require("modquery");

Initiate it.

	var modQuery = new modQ({
    	dbArgs: {
    		host              : "localhost",
    		user              : "bartender",
    		password          : "beerIsAwesome",
    		database          : "MyPub"
    	}
    });

Cheers!

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

Insert Rows:

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

compiles to

	INSERT  INTO `beers`  SET name = 'test Beer', abv = 5.7 ;
	INSERT  INTO `beers`  SET name = 'best Beer', abv = 9 ;


A more Advanced

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

compiles to

	INSERT  INTO `beers_mirror`
		SELECT id, name, abv  FROM `beers`
		WHERE (  `beers`.`id` IN (1,2,3,4)  )
		LIMIT 1,10
	ON DUPLICATE KEY UPDATE
		name = 'fooBar';

Update rows

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

compiles to

	UPDATE `beers_mirror`
		SET name = 'fooBar1'
	WHERE (  `beers_mirror`.`id` IN (1,2)  );


You can even enqueue heterogeneous Queries and execute them in pipe,
callback will then be called for each one of them.

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

compiles to

	INSERT  INTO `beers_mirror`
		SELECT id, name, abv
		FROM `beers`
		WHERE (  `beers`.`id` IN (1,2,3,4,5,6)  )
		LIMIT 0,10
	ON DUPLICATE KEY UPDATE
		name = 'fooBar';

	UPDATE `beers_mirror`
		SET name = 'fooBar1'
	WHERE (  `beers_mirror`.`id` IN (1, 2)  );

	SELECT  *   FROM `beers_mirror`   ;


## I found a bug ##

- First drink a beer,
- then create an issue,
- then pray & have faith.