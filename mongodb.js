import mongodb from 'mongodb'
import assert from 'assert'
const { MongoClient: mongo } = mongodb

let _db

const options = {
	useNewUrlParser: true,
	useUnifiedTopology: true
}

export const initDb = callback => {
	if (_db) {
		console.warn('Trying to init DB again!')
		return callback(null, _db)
	}
	mongo.connect(process.env.DB_URI, options, connected)
	function connected (err, dataBase) {
		if (err) {
			return callback(err)
		}
		console.log('DB initialized & Connected')
		_db = dataBase.db('Members')
		return callback(null, _db)
	}
}
export const getDb = getDb => {
	assert.ok(_db, 'Db has not been initialized. Please call init first.')
	return _db
}
