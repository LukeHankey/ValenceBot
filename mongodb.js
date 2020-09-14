const mongo = require("mongodb").MongoClient;
const assert = require("assert");

let _db;

const options = {
		useNewUrlParser: true,
		useUnifiedTopology: true
}

module.exports = {
	initDb: function initDb(callback) {
		if (_db) {
			console.warn("Trying to init DB again!");
			return callback(null, _db);
		}
		mongo.connect(process.env.DB_URI, options, connected);
		function connected(err, dataBase) {
			if (err) {
				return callback(err);
			}
			console.log("DB initialized & Connected");
			_db = dataBase.db("Members");
			return callback(null, _db);
		}
	},
	getDb: function getDb() {
		assert.ok(_db, "Db has not been initialized. Please call init first.");
		return _db;
	},

};