import dsf from '../dsf/calls/main.js'
import { handleDeletedCall } from '../dsf/calls/deletedCall.js'
import { restoreEventTimers } from '../dsf/calls/restoreTimers.js'
import { wsClient } from '../alt1WS.js'

/** DSF, and the test server used in development. */
export const DSF_GUILDS = ['420803245758480405', '668330890790699079']

const inDsf = (message) => Boolean(message.guild) && DSF_GUILDS.includes(message.guild.id)

/**
 * Everything that reads #dsf-calls lives in this process, including the Alt1
 * websocket and the event timers: the websocket adjusts timers that are held
 * in memory, so it has to run where the timers were started.
 */
export const onReady = async (client) => {
	await client.database.connect()
	client.logger.info(`DSFMessaging ready as ${client.user.tag}`)
	wsClient.connect()
	await restoreEventTimers(client)
}

const report = async (client, error) => {
	const channels = await client.database.channels
	return channels.errors.send(error)
}

/** dsf() itself checks that the message is in the event channel. */
export const onMessageCreate = async (client, message, handleCall = dsf) => {
	if (!inDsf(message)) return
	try {
		await handleCall(client, message)
	} catch (error) {
		await report(client, error)
	}
}

/** handleDeletedCall itself checks that the message was in the event channel. */
export const onMessageDelete = async (client, message, handleDelete = handleDeletedCall) => {
	if (!inDsf(message)) return
	try {
		await handleDelete(client, message)
	} catch (error) {
		await report(client, error)
	}
}
