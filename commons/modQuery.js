/*
 * Copyright (c) 2013. Developer Evangelos Pappas
 */

var events = require('events');
var mysql = require('mysql');

module.exports = (function () {

	var SqlBuilder = {
		select: function (wizzard) {
			var sql = "";
			sql += " SELECT "
				+ (wizzard.fields.length > 0 ? wizzard.fields.join(", ") : " * ") + " "
				+ " FROM " + wizzard.targetName + " "
				+ (wizzard.joins.length > 0 ? wizzard.joins.join(" ") + "" : "")
				+ (wizzard.filters.length > 0 ? " WHERE ( " + wizzard.filters.join(") AND (") + " )" : "")
				+ (wizzard.groupBy.length > 0 ? " GROUP BY " + wizzard.groupBy.join(",") + " " : "")
				+ (wizzard.sortBy.length > 0 ? " ORDER BY " + wizzard.sortBy.join(",") + " " : "") + " " + wizzard.sortDir
				+ (wizzard.limit.length > 0 ? " LIMIT " + wizzard.limit.join(",") + " " : "") + " ";
			return sql;
		},
		update: function (wizzard) {
			var sql = "";
			var sets = wizzard.sets.map(function (obj, i) {
				var str = "";
				for (var f in obj) {
					str += f + " = " + obj[f];
				}
				return str;
			});
			sql += " UPDATE " + (wizzard.option.length > 0 ? wizzard.option : "") + " "
				+ " `" + wizzard.targetName + "` "
				+ (sets.length > 0 ? " SET " + sets.join(", ") + "" : "")
				+ (wizzard.filters.length > 0 ? " WHERE ( " + wizzard.filters.join(") AND (") + " )" : "")
				+ (wizzard.sortBy.length > 0 ? " ORDER BY " + wizzard.sortBy.join(",") + " " : "") + " " + wizzard.sortDir
				+ (wizzard.limit.length > 0 ? " LIMIT " + wizzard.limit.join(",") + " " : "") + " ";
			return sql;
		},
		insert: function (wizzard) {
			var sql = "";
			var sets = wizzard.sets.map(function (obj, i) {
				var str = "";
				for (var f in obj) {
					str += f + " = " + obj[f];
				}
				return str;
			});
			var inserts = wizzard.inserts.map(function (obj, i) {
				var str = "";
				for (var f in obj) {
					str += f + " = " + obj[f];
				}
				return str;
			});
			sql += " INSERT " + (wizzard.option.length > 0 ? wizzard.option : "") + " "
				+ "INTO `" + wizzard.insTargetName + "` "
				+ (inserts.length > 0 ? " SET " + inserts.join(", ") + "" : "")
				+ (wizzard.bySelection ? SqlBuilder.select(wizzard) : "")
				+ (wizzard.onDuplicate && sets.length > 0 ? " ON DUPLICATE KEY UPDATE " + sets.join(", ") + " " : "");
			return sql;
		}
	};

	/**
	 *
	 * @param args
	 * @return {*}
	 * @constructor
	 */

	function ModQuery(args) {
		events.EventEmitter.call(this);
		this.__self = {
			db          : (args.db),
			dbArgs      : (args.dbArgs),
			callback    : (args.callback ? args.callback : function () {}),
			conf        : (args.conf || {sql: {}}),
			pingInterval: (args.pingInterval || 1500000) // 25 min
		};
		if (typeof this.__self.db === "undefined" && typeof this.__self.dbArgs !== "undefined") {
			this.__self.db = mysql.createConnection({
				host              : this.__self.dbArgs.host,
				user              : this.__self.dbArgs.user,
				password          : this.__self.dbArgs.password,
				database          : this.__self.dbArgs.database,
				multipleStatements: true
			});
			this.__self.db.options = {
				MPREFIX: (this.__self.dbArgs.prefix || '')
			};
			this.__self.db.connect();
		}
		this.__qMods = this.__self.conf.sql;
		this.isBuilt = false;
		this.sql = "";
		this.queue = [];
		this.wizzard = {
			fields       : [],
			insTarget    : {},
			insTargetName: "",
			target       : {},
			option       : "",
			targetName   : "",
			joins        : [],
			filters      : [],
			sets         : [],
			inserts      : [],
			groupBy      : [],
			sortBy       : [],
			sortDir      : [],
			limit        : [],
			mode         : "",
			onDuplicate  : false,
			bySelection  : false
		};
		this.resultset = {};
		var mySelf = this;

		// ping to keep persistent connection
		(function __ping(interval) {
			mySelf.pingInterval = setTimeout(function () {
				mySelf.__self.db.query("SELECT \"PING\"", function (err, rows) {
					if (err) {
						console.log(err);
					}
					__ping(interval);
				});
			}, interval);
		});//(this.__self.pingInterval);

		//this.on("newListener", console.log.bind(console, "-->newListener: "));

		return this;
	}

	// inherit
	(function (father) {
		// I am your Father!
		this.prototype = father;
		return this;
	}).call(ModQuery, new events.EventEmitter());

	/**
	 *
	 * @return {ModQuery}
	 */
	ModQuery.prototype.newModQuery = function () {
		// inherit
		return (function (father) {
			this.prototype = father;
			return this;
		}).call(new ModQuery(this.__self), new events.EventEmitter());
	};

	/**
	 *
	 * @return {*}
	 */
	ModQuery.prototype.getSQL = function () {
		if (!this.isBuilt) {
			this.build();
		}
		return this.sql;
	};

	/**
	 *
	 * @return {*}
	 */
	ModQuery.prototype.clear = function () {
		this.isBuilt = false;
		this.sql = "";
		this.wizzard = {
			fields       : [],
			target       : {},
			insTarget    : {},
			insTargetName: "",
			option       : "",
			targetName   : "",
			joins        : [],
			filters      : [],
			sets         : [],
			inserts      : [],
			groupBy      : [],
			sortBy       : [],
			sortDir      : [],
			limit        : [],
			mode         : "",
			onDuplicate  : false,
			bySelection  : false
		};
		this.resultset = {};
		return this;
	};

	/**
	 *
	 * @param keepFilters
	 * @returns {*}
	 */
	ModQuery.prototype.addParallel = function (keepFilters) {
		if (!this.isBuilt) {
			this.build();
		}
		this.isBuilt = false;
		var tmpFilts = [];
		var tmpJoins = [];
		if (keepFilters) {
			tmpFilts = this.wizzard.filters;
			tmpJoins = this.wizzard.joins;
		}
		this.wizzard = {
			fields       : [],
			target       : {},
			insTarget    : {},
			insTargetName: "",
			option       : "",
			targetName   : "",
			joins        : tmpJoins,
			filters      : tmpFilts,
			sets         : [],
			inserts      : [],
			groupBy      : [],
			sortBy       : [],
			sortDir      : [],
			limit        : [],
			mode         : "",
			onDuplicate  : false,
			bySelection  : false
		};
		return this;
	};

	/**
	 *
	 * @return {*}
	 */
	ModQuery.prototype.inAddition = function () {
		if (!this.isBuilt) {
			this.build();
		}
		this.queue.push(this.sql);
		this.isBuilt = false;
		this.wizzard = {
			fields       : [],
			target       : {},
			insTarget    : {},
			insTargetName: "",
			option       : "",
			targetName   : "",
			joins        : [],
			filters      : [],
			sets         : [],
			inserts      : [],
			groupBy      : [],
			sortBy       : [],
			sortDir      : [],
			limit        : [],
			mode         : "",
			onDuplicate  : false,
			bySelection  : false
		};
		return this;
	};

	/**
	 *
	 * @returns {*}
	 */
	ModQuery.prototype.lazyExecute = function (handler) {
		if (!this.isBuilt) {
			this.build();
		}

		this.queue.push(this.sql);
		var __this = this;
		var observ = new events.EventEmitter();

		setImmediate(handler.bind(observ, observ));

		for (var i = 0; i < __this.queue.length; ++i) {
			setImmediate((function (sql, index) {
				__this.__self.db.query(sql)
					.on('error', observ.emit.bind(observ, 'error', __this.__self.db)) // error
					.on('fields', observ.emit.bind(observ, 'fields', __this.__self.db)) // fields
					.on('result', observ.emit.bind(observ, 'result', __this.__self.db)) // result
					.on('end', observ.emit.bind(observ, 'end', __this.__self.db)); // end
			}).bind(__this, this.queue[i], i));
		}
		return __this;
	};

	/**
	 *
	 * @param func
	 * @returns {*}
	 */
	ModQuery.prototype.execute = function (func) {
		if (!this.isBuilt) {
			this.build();
		}
		if (typeof func !== "undefined") {
			this.__self.callback = func;
		}

		this.queue.push(this.sql);
		var __this = this;
		for (var i = 0; i < this.queue.length; ++i) {
			(function (sql, index) {
				__this.__self.db.query(sql,function (err, rows, fields) {
					if (err) {
						__this.__self.callback([], err, this.sql, index);
						return;
					}
					__this.resultset = rows;
					__this.__self.callback(rows, null, this.sql, index);
				}).on('error', __this.emit.bind(__this, 'error', __this.__self.db)) // error
					//.on('fields', __this.emit.bind(__this, 'fields', __this.__self.db)) // fields
					//.on('result', __this.emit.bind(__this, 'result', __this.__self.db)) // result
					.on('end', __this.emit.bind(__this, 'end', __this.__self.db));
			})(this.queue[i], i);
		}
		return this;
	};

	/**
	 *
	 * @param sql
	 * @param func
	 * @returns {*}
	 */
	ModQuery.prototype.executeSQL = function (sql, func) {
		if (typeof func !== "undefined") {
			this.__self.callback = func;
		}

		var __this = this;
		this.__self.db.query(sql,function (err, rows, fields) {
			if (err) {
				__this.__self.callback([], err, this.sql, fields);
				return;
			}
			__this.resultset = rows;
			__this.__self.callback(rows, null, this.sql, fields);
		}).on('error', __this.emit.bind(__this, 'error', this.__self.db)) // error
			.on('fields', __this.emit.bind(__this, 'fields', this.__self.db)) // fields
			.on('result', __this.emit.bind(__this, 'result', this.__self.db)) // result
			.on('end', __this.emit.bind(__this, 'end', this.__self.db));
		return this;
	};

	/**
	 *
	 * @return {*}
	 */
	ModQuery.prototype.build = function () {
		var __this = this;
		if (this.isBuilt) throw "ModQuery is Built";
		switch (this.wizzard.mode) {
			case "select":
				this.sql += SqlBuilder.select(this.wizzard) + " ; ";
				break;
			case "update":
				this.sql += SqlBuilder.update(this.wizzard) + " ; ";
				break;
			case "insert":
				this.sql += SqlBuilder.insert(this.wizzard) + " ; ";
				break;
			default:
				break;
		}
		this.isBuilt = true;
		return this;
	};

	/**
	 *
	 * @param sql
	 * @returns {*}
	 */
	ModQuery.prototype.prependSQL = function (sql) {
		if (this.isBuilt) {
			throw "ModQuery is Built";
		}
		if (typeof sql !== "string") {
			throw "Wrong arguments, prependSQL accepts string only.";
		}
		if (sql.slice(-1) !== ";") {
			sql += ";";
		}
		this.sql += (sql + " ");
		return this;
	};

	/**
	 *
	 * @param target
	 * @param option
	 * @returns {*}
	 */
	ModQuery.prototype.insertInto = function (target, option) {
		if (this.isBuilt) {
			throw "ModQuery is Built";
		}

		if (typeof this.__qMods[target] !== "undefined") {
			this.wizzard.insTarget = this.__qMods[target];
			this.wizzard.insTargetName = target;
		}
		else {
			this.wizzard.insTarget = target;
			this.wizzard.insTargetName = target;
		}
		if (typeof option !== "undefined") {
			this.wizzard.option = option;
		}
		this.wizzard.mode = "insert";
		return this;
	};

	/**
	 *
	 * @returns {*}
	 */
	ModQuery.prototype.onDuplicate = function () {
		if (this.isBuilt) {
			throw "ModQuery is Built";
		}
		this.wizzard.onDuplicate = true;
		return this;
	};

	/**
	 *
	 * @param target
	 * @param option
	 * @returns {*}
	 */
	ModQuery.prototype.update = function (target, option) {
		if (this.isBuilt) {
			throw "ModQuery is Built";
		}
		if (typeof this.__qMods[target] !== "undefined") {
			this.wizzard.target = this.__qMods[target];
			this.wizzard.targetName = target;
		}
		else {
			this.wizzard.target = {
				name  : module,
				fields: {},
				joins : {}
			};
			this.wizzard.targetName = target;
		}
		if (typeof option !== "undefined") {
			this.wizzard.option = option;
		}
		this.wizzard.mode = "update";
		return this;
	};

	/**
	 *
	 * @param field
	 * @param value
	 * @returns {*}
	 */
	ModQuery.prototype.set = function (field, value) {
		if (this.isBuilt) throw "ModQuery is Built";
		if (typeof field === "object") {
			for (var f in field) {
				if (field.hasOwnProperty(f)) {
					var obj = {};
					obj[f] = (typeof field[f] === "string" && field[f][0] !== "(" ? "'" + field[f] + "'" : field[f]);
					this.wizzard.sets.push(obj);
				}
			}
		}
		else {
			var obj = {};
			obj[field] = (typeof value === "string" && value[0] !== "(" ? "'" + value + "'" : value);
			this.wizzard.sets.push(obj);
		}
		return this;
	};

	/**
	 *
	 * @param field
	 * @param value
	 * @returns {*}
	 */
	ModQuery.prototype.insert = function (field, value) {
		if (this.isBuilt) throw "ModQuery is Built";
		if (typeof field === "object") {
			for (var f in field) {
				if (field.hasOwnProperty(f)) {
					var obj = {};
					obj[f] = (typeof field[f] === "string" && field[f][0] !== "(" ? "'" + field[f] + "'" : field[f]);
					this.wizzard.inserts.push(obj);
				}
			}
		}
		else {
			var obj = {};
			obj[field] = (typeof value === "string" && value[0] !== "(" ? "'" + value + "'" : value);
			this.wizzard.inserts.push(obj);
		}
		return this;
	};

	/**
	 *
	 * @param fields
	 * @return {*}
	 */
	ModQuery.prototype.select = function (fields) {
		if (this.isBuilt) throw "ModQuery is Built";
		var fArr = [];
		if (typeof fields === "undefined") {
			fArr.push("*");
		}
		else if (typeof fields !== "object") {
			fArr.push(fields);
		}
		else {
			fArr = fields;
		}

		for (var i in fArr) {
			if (typeof this.wizzard.target !== "undefined" && typeof this.wizzard.target.fields !== "undefined"
				&& typeof this.wizzard.target.fields[fArr[i]] !== "undefined" && typeof this.wizzard.target.fields[fArr[i]] !== "undefined") {
				this.wizzard.fields.push(this.wizzard.target.fields[fArr[i]].select);
			} else {
				this.wizzard.fields.push(fArr[i]);
			}
		}
		if (this.wizzard.mode.length == 0) {
			this.wizzard.mode = "select";
		}
		else if (this.wizzard.mode === "insert") {
			this.wizzard.bySelection = true;
		}
		return this;
	};

	/**
	 *
	 * @param module
	 * @returns {*}
	 */
	ModQuery.prototype.from = function (module) {
		if (this.isBuilt) {
			throw "ModQuery is Built";
		}
		if (typeof this.__qMods[module] !== "undefined") {
			this.wizzard.target = this.__qMods[module];
			this.wizzard.targetName = module;
		}
		else {
			this.wizzard.target = {
				name  : module,
				fields: {},
				joins : {}
			};
			this.wizzard.targetName = module;
		}

		if (this.wizzard.mode.length == 0) {
			this.wizzard.mode = "select";
		}
		else if (this.wizzard.mode === "insert") {
			this.wizzard.bySelection = true;
		}
		return this;
	};

	/**
	 *
	 * @param fields
	 * @return {*}
	 */
	ModQuery.prototype.groupBy = function (fields) {
		if (this.isBuilt) throw "ModQuery is Built";
		var fArr = [];
		if (typeof fields !== "object") {
			fArr.push(fields);
		} else {
			fArr = fields;
		}
		this.wizzard.groupBy = this.wizzard.groupBy.concat(fArr);
		return this;
	};

	/**
	 *
	 * @param fields
	 * @return {*}
	 */
	ModQuery.prototype.sortBy = function (fields, dir) {
		if (this.isBuilt) throw "ModQuery is Built";
		var fArr = [];
		if (typeof fields !== "object") {
			fArr.push(fields);
		} else {
			fArr = fields;
		}
		this.wizzard.sortBy = this.wizzard.sortBy.concat(fArr);
		this.wizzard.sortDir = (dir || "ASC")
		return this;
	};

	/**
	 *
	 * @param page
	 * @param limit
	 * @returns {*}
	 */
	ModQuery.prototype.limit = function (page, limit) {
		if (this.isBuilt) throw "ModQuery is Built";
		if (typeof limit !== "undefined") {
			this.wizzard.limit = [page, limit];
		} else {
			this.wizzard.limit = [page];
		}
		return this;
	};

	/**
	 *
	 * @param jSQL
	 * @returns {*}
	 */
	ModQuery.prototype.joinSQL = function (jSQL) {
		if (this.isBuilt) throw "ModQuery is Built";
		var __this = this;

		function recurseJoins(mod, wizz) {
			if (typeof wizz.target !== "undefined" && typeof wizz.target.joins[mod] !== "undefined") {
				if (typeof wizz.target.joins[mod].intermediate !== "undefined") {
					recurseJoins(wizz.target.joins[mod].intermediate, wizz);
					wizz.joins.push(wizz.target.joins[mod].sql);
				} else {
					wizz.joins.push(wizz.target.joins[mod].sql);
				}
			}
			else if (typeof mod !== "undefined") {
				wizz.joins.push(mod);
			}
			return __this;
		}

		return recurseJoins(jSQL, this.wizzard);
	};

	/**
	 *
	 * @return {*}
	 */
	ModQuery.prototype.filterBy = function (module, field) {
		if (this.isBuilt) throw "ModQuery is Built";
		var __this = this;

		function recurseJoins(mod, wizz) {
			if (typeof wizz.target !== "undefined" && typeof wizz.target.joins[mod] !== "undefined") {
				if (typeof wizz.target.joins[mod].intermediate !== "undefined") {
					recurseJoins(wizz.target.joins[mod].intermediate, wizz);
					wizz.joins.push(wizz.target.joins[mod].sql);
				} else {
					wizz.joins.push(wizz.target.joins[mod].sql);
				}
			}
			return __this;
		}

		recurseJoins(module, this.wizzard);

		return(new __filter("`" + module + "`.`" + field + "`", false, this, this.wizzard));
	};

	/**
	 *
	 * @return {*}
	 */
	ModQuery.prototype.filterBySQL = function (sql) {
		if (this.isBuilt) throw "ModQuery is Built";
		return(new __filter(sql, true, this, this.wizzard));
	};

	var __filter = (function () {

		/**
		 *
		 * @param f
		 * @param isPureSQL
		 * @param modQ
		 * @param wizz
		 * @returns {*}
		 * @constructor
		 */
		function Filter(f, isPureSQL, modQ, wizz) {
			this.__modQ = modQ;
			this.__wizz = wizz;
			if (isPureSQL) {
				this.field = "";
				this.sql = f;
				this.opperator = "";
				this.filtVal = "";
				this.__wizz.filters.push(this.sql);
				return this.__modQ;
			}

			this.field = f;
			this.sql = "";
			this.opperator = "";
			this.filtVal = "";

			return this;
		}

		/**
		 *
		 * @param arg
		 * @return {*}
		 */
		Filter.prototype.in = function (arg) {

			var tmp = [];
			if (typeof arg !== "object") {
				tmp.push(arg);
			} else {
				tmp = arg;
			}

			this.opperator = "IN";
			//this.filtVal = (typeof tmp[0] === "string" ? "('" + tmp.join("','") + "')" : "(" + tmp.join(",") + ")");
			this.filtVal = "(" + tmp.join(",") + ")";
			this.sql = " " + this.field + " " + this.opperator + " " + this.filtVal + " ";
			this.__wizz.filters.push(this.sql);
			return this.__modQ;
		};

		/**
		 *
		 * @param arg
		 * @return {*}
		 */
		Filter.prototype.regex = function (arg) {
			this.opperator = "REGEXP";
			this.filtVal = arg;
			this.sql = " " + this.field + " " + this.opperator + " " + this.filtVal + " ";
			this.__wizz.filters.push(this.sql);

			return this.__modQ;
		};

		/**
		 *
		 * @param arg
		 * @return {*}
		 */
		Filter.prototype.equals = function (arg) {
			this.opperator = "=";
			this.filtVal = (typeof arg === "string" && arg[0] !== "(" ? "'" + arg + "'" : arg);
			this.sql = " " + this.field + " " + this.opperator + " " + this.filtVal + " ";
			this.__wizz.filters.push(this.sql);

			return this.__modQ;
		};

		/**
		 *
		 * @param arg
		 * @return {*}
		 */
		Filter.prototype.notEquals = function (arg) {
			this.opperator = "!=";
			this.filtVal = (typeof arg === "string" && arg[0] !== "(" ? "'" + arg + "'" : arg);
			this.sql = " " + this.field + " " + this.opperator + " " + this.filtVal + " ";
			this.__wizz.filters.push(this.sql);

			return this.__modQ;
		};

		/**
		 *
		 * @param arg
		 * @return {*}
		 */
		Filter.prototype.contains = function (arg) {
			this.opperator = "LIKE";
			this.filtVal = "'%" + arg + "%'";
			this.sql = " " + this.field + " " + this.opperator + " " + this.filtVal + " ";
			this.__wizz.filters.push(this.sql);

			return this.__modQ;
		};

		/**
		 *
		 * @param arg
		 * @return {*}
		 */
		Filter.prototype.startsWith = function (arg) {
			this.opperator = "LIKE";
			this.filtVal = "'%" + arg + "'";
			this.sql = " " + this.field + " " + this.opperator + " " + this.filtVal + " ";
			this.__wizz.filters.push(this.sql);

			return this.__modQ;
		};

		/**
		 *
		 * @param arg
		 * @return {*}
		 */
		Filter.prototype.endsWith = function (arg) {
			this.opperator = "LIKE";
			this.filtVal = "'" + arg + "%'";
			this.sql = " " + this.field + " " + this.opperator + " " + this.filtVal + " ";
			this.__wizz.filters.push(this.sql);

			return this.__modQ;
		};

		/**
		 *
		 * @param arg
		 * @return {*}
		 */
		Filter.prototype.lessThan = function (arg) {
			this.opperator = " < ";
			this.filtVal = arg;
			this.sql = " " + this.field + " " + this.opperator + " " + this.filtVal + " ";
			this.__wizz.filters.push(this.sql);

			return this.__modQ;
		};

		/**
		 *
		 * @param arg
		 * @return {*}
		 */
		Filter.prototype.lessThanEquals = function (arg) {
			this.opperator = " <= ";
			this.filtVal = arg;
			this.sql = " " + this.field + " " + this.opperator + " " + this.filtVal + " ";
			this.__wizz.filters.push(this.sql);

			return this.__modQ;
		};

		/**
		 *
		 * @param arg
		 * @return {*}
		 */
		Filter.prototype.greaterThan = function (arg) {
			this.opperator = " > ";
			this.filtVal = arg;
			this.sql = " " + this.field + " " + this.opperator + " " + this.filtVal + " ";
			this.__wizz.filters.push(this.sql);

			return this.__modQ;
		};

		/**
		 *
		 * @param arg
		 * @return {*}
		 */
		Filter.prototype.greaterThanEquals = function (arg) {
			this.opperator = " >= ";
			this.filtVal = arg;
			this.sql = " " + this.field + " " + this.opperator + " " + this.filtVal + " ";
			this.__wizz.filters.push(this.sql);

			return this.__modQ;
		};

		return Filter;
	})();

	return ModQuery;
})();