/* eslint-disable no-unused-vars */
import { Client, Collection } from 'discord.js'
import { MongoDataBase } from './DataBase.js'
import { Load } from './handlers/index.js'
import { logger } from './logging.js'
import dotenv from 'dotenv'
dotenv.config()

const client = new Client({
	intents: ['Guilds', 'GuildMessages', 'MessageContent', 'GuildMessageReactions', 'DirectMessages'],
	partials: ['Message', 'Reaction', 'Channel'],
	sweepers: {
		messages: {
			interval: 600,
			lifetime: 2700
		}
	}
})
client.logger = logger
client.commands = new Collection()

const database = new MongoDataBase('Members')
client.database = database

const _ = new Load(client)
process.on('unhandledRejection', (reason, p) => {
	logger.error(`Unhandled Rejection at: ${p}\nreason: ${reason}`)
})

client.login(process.env.NODE_ENV === 'DEV' ? process.env.DEVELOPMENT_BOT : process.env.BOT_TOKEN)

export default client
