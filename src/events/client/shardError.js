export default (client, error, shardId) => {
	client.logger.error(`Gateway shard ${shardId} error: ${error.stack ?? error}`)
}
