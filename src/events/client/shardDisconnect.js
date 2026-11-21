import { GatewayCloseCodes } from 'discord.js'

// discord.js only emits shardDisconnect for close codes it will not recover
// from (4004, 4010-4014), so the gateway is gone for good. The process stays up
// on the DSF socket and MongoDB alone, which is how the bot sat disconnected
// for five days. Exit and let the container restart policy bring it back.
// `event.reason` is a fixed deprecation string in v14, so the code is the cause.
export default (client, event, shardId) => {
	const name = GatewayCloseCodes[event.code] ?? 'unknown'
	client.logger.error(`Gateway shard ${shardId} closed with ${event.code} (${name}) and will not reconnect. Exiting.`)
	// ponytail: exits without flushing winston, so combined.log can miss this
	// line; the console line still lands in `docker logs`. Await the file
	// transport's finish if the file copy matters.
	process.exit(1)
}
