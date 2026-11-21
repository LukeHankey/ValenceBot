/* eslint-disable no-unused-vars */
import { Client, Collection } from 'discord.js'
import { MongoDataBase } from './DataBase.js'
import { Load } from './handlers/index.js'
import { logger } from './logging.js'
import dotenv from 'dotenv'
dotenv.config()

const client = new Client({
	intents: ['Guilds', 'GuildMessages', 'GuildMessageReactions', 'DirectMessages'],
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

// A failed login (bad token, disallowed intents) used to exit 0 once the
// rejection was logged. Exit non-zero so it reads as a crash.
client.login(process.env.NODE_ENV === 'DEV' ? process.env.DEVELOPMENT_BOT : process.env.BOT_TOKEN).catch((err) => {
	logger.error(`Login failed: ${err.stack ?? err}`)
	process.exit(1)
})

export default client
