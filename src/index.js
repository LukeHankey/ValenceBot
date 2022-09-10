/* eslint-disable no-unused-vars */
import cron from 'node-cron'
import { Client, Collection } from 'discord.js'
import { DataBase, MongoCollection } from './DataBase.js'
import { getData, addActive } from './scheduler/clan.js'
import { Load } from './handlers/index.js'
import dotenv from 'dotenv'
dotenv.config()

const client = new Client({
	intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent', 'GuildMessageReactions', 'DirectMessages'],
	partials: ['Message', 'Reaction', 'Channel']
})
client.commands = new Collection()

const _ = new Load(client)
process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at:', p, 'reason:', reason)
})

client.login(process.env.NODE_ENV === 'DEV' ? process.env.DEVELOPMENT_BOT : process.env.BOT_TOKEN)

const __ = new DataBase()
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
