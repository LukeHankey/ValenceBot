import { Client, Collection } from 'discord.js'
import { initDb as connection } from './mongodb.js'
import dotenv from 'dotenv'
dotenv.config()

const client = new Client({ intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES'], partials: ['MESSAGE', 'REACTION', 'CHANNEL'] })
client.commands = new Collection();

['commands', 'events'].forEach(async x => {
	const handler = await import(`./handlers/${x}.js`)
	handler.default(client)
})

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at:', p, 'reason:', reason)
})

connection(err => { if (err) console.log(err) })

client.login(process.env.NODE_ENV === 'DEV' ? process.env.DEVELOPMENT_BOT : process.env.BOT_TOKEN)
