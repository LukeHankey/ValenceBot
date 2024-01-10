/* eslint-disable no-unused-vars */
import cron from 'node-cron'
import { Client, Collection } from 'discord.js'
import { MongoCollection } from './DataBase.js'
import { getData, addActive } from './scheduler/clan.js'
import { Load } from './handlers/index.js'
import { logger } from './logging.js'
import dotenv from 'dotenv'
dotenv.config()

const client = new Client({
	intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent', 'GuildMessageReactions', 'DirectMessages'],
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

const _ = new Load(client)
process.on('unhandledRejection', (reason, p) => {
	logger.error(`Unhandled Rejection at: ${p}\nreason: ${reason}`)
})

const db = new MongoCollection('Users')

client.login(process.env.NODE_ENV === 'DEV' ? process.env.DEVELOPMENT_BOT : process.env.BOT_TOKEN)

// Daily at 5am
cron.schedule('0 5 * * *', async () => {
	logger.info('running')
	await addActive(db)
})

// Daily at 10am
cron.schedule('0 10 * * *', async () => {
	await getData(db)
})

export default client
