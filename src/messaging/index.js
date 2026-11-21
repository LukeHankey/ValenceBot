/**
 * DSFMessaging: a second Discord app, only in DSF, that reads #dsf-calls.
 *
 * ValenceBot lost the MessageContent intent, so it receives every message in
 * #dsf-calls with empty content and cannot count, time or moderate calls.
 * This app has the intent and runs the same call code. Buttons on the
 * messages it posts come back to it, so it handles interactions too.
 */
import { Client, Collection } from 'discord.js'
import dotenv from 'dotenv'
import { MongoDataBase } from '../DataBase.js'
import { logger } from '../logging.js'
import { startHeartbeat } from '../heartbeat.js'
import { onReady, onMessageCreate, onMessageDelete } from './handlers.js'
import interactionCreate from '../events/guild/interactionCreate.js'
import shardDisconnect from '../events/client/shardDisconnect.js'
import shardError from '../events/client/shardError.js'
import error from '../events/client/error.js'
dotenv.config()

const token = process.env.DSF_MESSAGING_TOKEN
if (!token) {
	logger.error('DSF_MESSAGING_TOKEN is not set; DSFMessaging cannot log in.')
	process.exit(1)
}

const client = new Client({
	intents: ['Guilds', 'GuildMessages', 'MessageContent', 'GuildMessageReactions'],
	partials: ['Message', 'Reaction', 'Channel'],
	sweepers: { messages: { interval: 600, lifetime: 2700 } }
})
client.logger = logger
client.commands = new Collection()
client.database = new MongoDataBase('Members')
client.database.discord = client

client.once('clientReady', () => onReady(client))
client.on('messageCreate', (message) => onMessageCreate(client, message))
client.on('messageDelete', (message) => onMessageDelete(client, message))
client.on('interactionCreate', (interaction) => interactionCreate(client, interaction))
client.on('shardDisconnect', (event, id) => shardDisconnect(client, event, id))
client.on('shardError', (err, id) => shardError(client, err, id))
client.on('error', (err) => error(client, err))

process.on('unhandledRejection', (reason, p) => {
	logger.error(`Unhandled Rejection at: ${p}\nreason: ${reason}`)
})

client.login(token).catch((err) => {
	logger.error(`DSFMessaging login failed: ${err.stack ?? err}`)
	process.exit(1)
})
startHeartbeat(client, 'DSFMessaging')

export default client
