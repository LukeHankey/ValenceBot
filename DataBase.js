import client from './index.js'
import { redDark } from './colors.js'
import { promisify } from 'util'
import pkg from 'mongodb'
const wait = promisify(setTimeout)
const { MongoClient } = pkg

export class DataBase {
	static #options = {
		useNewUrlParser: true,
		useUnifiedTopology: true
	}

	static #db = null
	static #name = 'Members'

	constructor() {
		this.#initialize();
	}

	async #initialize() {
		const mongo = new MongoClient(process.env.DB_URI, DataBase.#options)
		try {
			await mongo.connect()
			DataBase.#db = mongo.db(DataBase.#name)
		}
		catch (error) {
			console.log(error)
		}
	}

	get db() {
		return DataBase.#db
	}
    
	get collection() {        
		return DataBase.#db.collection(this.collectionName)
	}
}

export class MongoCollection extends DataBase {
	/**
     * @param  {string} collectionName The name of the collection.
     */
	constructor(collectionName) {
		super()
		this.collectionName = collectionName;
		this.#validateCollectionName(collectionName)
	}
	/**
     * @returns {String[]} An array of collection names.
     */
	async collectionNames() {
		let collectionNames;
		try {
			collectionNames = await this.db.listCollections().toArray()
		}
		catch (err) {
			await wait(3000)
			collectionNames = await this.db.listCollections().toArray()
		}
		finally {
			collectionNames = collectionNames.map(c => c.name)
		}
        
		return collectionNames
	}
    
	/**
     * @param  {string} name The name of the collection.
     */
	async #validateCollectionName(name) {
		let collectionNames = await this.collectionNames()

		if (typeof name !== 'string') throw new Error(`${name} must be a string.`)

		if (collectionNames.includes(name)) return true
		else throw new Error(`${name} is not a valid collection name. Must be one of ${collectionNames.join(', ')}`);
	}
	/**
     * @returns {Promise<Object>}
     */
	get channels() {
		return new Promise(async (resolve, reject) => {
			try {
				const { channels: { vis, errors, logs } } = await this.collection.findOne({ _id: 'Globals' }, { projection: { channels: { vis: 1, errors: 1, logs: 1 } } })
				const channel = client.channels.cache.get(this.id)
				const channels = {
					vis: {
						id: vis,
						// content could be both embed or content
						send: function (content) {
							return channel.send(content)
						}
					},
					errors: {
						id: errors,
						embed: function (err) {
							const filePath = import.meta.url.split('/')
							const fileName = filePath[filePath.length - 1]
							const embed = new MessageEmbed()
								.setTitle(`An error occured in ${fileName}`)
								.setColor(redDark)
								.addField(`${err.message}`, `\`\`\`${err.stack}\`\`\``)
							return embed
						},
						send: function (...args) {
							return channel.send({ embeds: [this.embed(...args)] })
						}
					},
					logs: {
						id: logs,
						send: function (content) {
							return channel.send({ content })
						}
					}
				}
    
				resolve(channels)
			}
			catch (err) {
				reject(err)
			}
		})
	}
}