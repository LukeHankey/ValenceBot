import pkg from 'mongodb'
import { logger } from './logging.js'
import { buildErrorEmbed, originFromStack } from './errorEmbed.js'
import dotenv from 'dotenv'
const { MongoClient } = pkg
dotenv.config()

const dataBaseOptions = {
	compressors: ['snappy']
}
const dataBaseURI = process.env.DB_URI

export class MongoDataBase {
	constructor(databaseName) {
		this.databaseName = databaseName
	}

	get client() {
		return new MongoClient(dataBaseURI, dataBaseOptions)
	}

	async connect() {
		await this.client.connect()

		console.log('Connected to the DataBase.')
		this.db = this.client.db(this.databaseName)
	}

	collection(name) {
		return this.db.collection(name)
	}

	get settings() {
		return this.collection('Settings')
	}

	get users() {
		return this.collection('Users')
	}

	get facts() {
		return this.collection('Facts')
	}

	get scoutTracker() {
		return this.collection('ScoutTracker')
	}

	/**
	 * @returns {Promise<Object>}
	 */
	get channels() {
		const getChannelsFromDB = async () => {
			const client = await import('./index.js')
			const {
				channels: { vis, errors, logs }
			} = await this.settings.findOne({ _id: 'Globals' }, { projection: { channels: { vis: 1, errors: 1, logs: 1 } } })
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
					// `context` is optional: pass whatever the call site knows, e.g.
					// { command: 'worlds', user: interaction.user.tag }.
					embed: function (err, context) {
						const origin = originFromStack(err)
						logger.error(`${err?.stack ?? err} (${origin.path}:${origin.line})`)
						return buildErrorEmbed(err, context)
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
					// Takes `rest` like logs.send: without it a caller passing
					// { files: [...] } would have its attachment silently dropped.
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
