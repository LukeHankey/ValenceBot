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
		// The Discord client this database belongs to. It used to be found by
		// importing ./index.js, which would start ValenceBot inside any other
		// process that used the database, such as DSFMessaging.
		const discord = this.discord
		const getChannelsFromDB = async () => {
			const {
				channels: { errors, logs }
			} = await this.settings.findOne({ _id: 'Globals' }, { projection: { channels: { errors: 1, logs: 1 } } })
			const channels = {
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
						const embed = this.embed(...args) // also logs the error
						// A bot that is not in the error channel's server has nothing to post to.
						return discord.channels.cache.get(this.id)?.send({ embeds: [embed] })
					}
				},
				logs: {
					id: logs,
					send: function (content, rest) {
						const channel = discord.channels.cache.get(this.id)
						if (!channel) return logger.info(typeof content === 'string' ? content : JSON.stringify(content))
						return channel.send({ content, ...rest })
					}
				},
				dsfOwners: {
					id: '781145730710503434',
					// Takes `rest` like logs.send: without it a caller passing
					// { files: [...] } would have its attachment silently dropped.
					send: function (content, rest) {
						const channel = discord.channels.cache.get(this.id)
						if (!channel) return logger.info(typeof content === 'string' ? content : JSON.stringify(content))
						return channel.send({ content, ...rest })
					}
				}
			}
			return channels
		}
		return getChannelsFromDB()
	}
}
