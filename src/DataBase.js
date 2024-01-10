import Color from './colors.js'
import { EmbedBuilder } from 'discord.js'
import pkg from 'mongodb'
import { logger } from './logging.js'
import dotenv from 'dotenv'
const { MongoClient } = pkg
dotenv.config()

const dataBaseOptions = {
	useNewUrlParser: true,
	useUnifiedTopology: true
}
const dataBaseURI = process.env.DB_URI

export class MongoCollection {
	/**
	 * @param  {string} collectionName The name of the collection.
	 */
	constructor(collectionName) {
		this.collectionName = collectionName
		this.client = new MongoClient(dataBaseURI, dataBaseOptions)
		this.#connect()
		this.#validateConnection(collectionName)
	}

	#connect() {
		this.client.connect()
		this.db = this.client.db('Members')
	}

	/**
	 * @returns {String[]} An array of collection names.
	 */
	async collectionNames() {
		let collectionNames
		try {
			collectionNames = await this.db.listCollections().toArray()
			collectionNames = collectionNames.map((c) => c.name)
		} catch (err) {
			logger.error(err)
			collectionNames = this.db.listCollections().toArray()
			collectionNames = collectionNames.map((c) => c.name)
			logger.verbose('Retry success.')
		}
		return collectionNames
	}

	get collection() {
		return this.db.collection(this.collectionName)
	}

	/**
	 * @param  {string} name The name of the collection.
	 */
	async #validateConnection(name) {
		const collectionNames = await this.collectionNames()

		if (typeof name !== 'string') throw new Error(`${name} must be a string.`)
		if (collectionNames.includes(name)) return true
		else {
			throw new Error(`${name} is not a valid collection name. Must be one of ${collectionNames.join(', ')}`)
		}
	}

	/**
	 * @returns {Promise<Object>}
	 */
	get channels() {
		const getChannelsFromDB = async () => {
			const client = await import('./index.js')
			const {
				channels: { vis, errors, logs }
			} = await this.collection.findOne({ _id: 'Globals' }, { projection: { channels: { vis: 1, errors: 1, logs: 1 } } })
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
						logger.error(err.stack)
						const filePath = import.meta.url.split('/')
						const fileName = filePath[filePath.length - 1]
						const embed = new EmbedBuilder()
							.setTitle(`An error occured in ${fileName}`)
							.setColor(Color.redDark)
							.addFields({
								name: `${err.message}`,
								value: `\`\`\`${err.stack
									.split('\n')
									.filter((s) => !s.includes('node_modules'))
									.join('\n')}\`\`\``
							})
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
				},
				dsfOwners: {
					id: '781145730710503434',
					send: function (content) {
						const channel = client.default.channels.cache.get(this.id)
						return channel.send(content)
					}
				}
			}
			return channels
		}
		return getChannelsFromDB()
	}
}
