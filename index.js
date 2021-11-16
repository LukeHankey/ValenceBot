import cron from 'node-cron'
import { Client, Collection } from 'discord.js'
import { DataBase, MongoCollection } from './DataBase.js'
import { getData, addActive } from './scheduler/clan.js'
import dotenv from 'dotenv'
dotenv.config()

const client = new Client({ intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES'], partials: ['MESSAGE', 'REACTION', 'CHANNEL'] })
client.commands = new Collection()
const handlers = ['commands', 'events']

handlers.forEach(async x => {
	const handler = await import(`./handlers/${x}.js`)
	handler.default(client)
})

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at:', p, 'reason:', reason)
})

client.login(process.env.NODE_ENV === 'DEV' ? process.env.DEVELOPMENT_BOT : process.env.BOT_TOKEN)
const _ = new DataBase(client)
const db = new MongoCollection('Users')

// Daily at 5am
cron.schedule('0 5 * * *', async () => {
	console.log('running')
	await addActive(db)
})

// Daily at 10am
cron.schedule('0 10 * * *', async () => {
	await getData(db)
})

export default client
