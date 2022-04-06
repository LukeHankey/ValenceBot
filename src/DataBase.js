import Color from './colors.js'
import { promisify } from 'util'
import { EmbedBuilder } from 'discord.js'
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
		if (!DataBase.#db) this.#initialize()
	}

	async #initialize() {
		try {
			// 1 Connection per event
			const mongo = new MongoClient(process.env.DB_URI, DataBase.#options)
			await mongo.connect()
			DataBase.#db = mongo.db(DataBase.#name)
			console.log('Database connected.')
		}
		catch (error) {
			console.log(error)
		}
	}

	async #retry() {
		console.log('Retrying connection...')
		await this.#initialize()
		await this.collectionNames()
	}

	/**
     * @returns {String[]} An array of collection names.
     */
	 async collectionNames() {
		let collectionNames;
		try {
			// Attempt to wait 5 seconds to connect database before any retries
			if (!DataBase.#db) await wait(5000)
			collectionNames = await DataBase.#db.listCollections().toArray()
			collectionNames = collectionNames.map(c => c.name)
		}
		catch (err) {
			if (err.name === 'TypeError' && err.message.includes('listCollections')) await this.#retry()
			else console.error(err)
			collectionNames = await DataBase.#db.listCollections().toArray()
			collectionNames = collectionNames.map(c => c.name)
			console.log('Retry success.')
		}
		return collectionNames
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
		const getChannelsFromDB = async () => {
			const client = await import('./index.js')
			const { channels: { vis, errors, logs } } = await this.collection.findOne({ _id: 'Globals' }, { projection: { channels: { vis: 1, errors: 1, logs: 1 } } })
			const channels = {
				vis: {
					id: vis,
					// content could be both embed or content
					send: function (content) {
						const channel = client.default.channels.cache.get(this.id)
						return channel.send(content)
					}
				},
				errors: {
					id: errors,
					embed: function (err) {
						const filePath = import.meta.url.split('/')
						const fileName = filePath[filePath.length - 1]
						const embed = new EmbedBuilder()
							.setTitle(`An error occured in ${fileName}`)
							.setColor(Color.redDark)
							.addFields({ name: `${err.message}`, value: `\`\`\`${err.stack.split('\n').filter(s => !s.includes('node_modules')).join('\n')}\`\`\`` })
						return embed
					},
					send: function (...args) {
						const channel = client.default.channels.cache.get(this.id)
						return channel.send({ embeds: [this.embed(...args)] })
					}
				},
				logs: {
					id: logs,
					send: function (content, rest) {
						const channel = client.default.channels.cache.get(this.id)
						return channel.send({ content, ...rest })
					}
				}
			}
			return channels
		}
		return getChannelsFromDB()
	}
}
