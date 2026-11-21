export default (client, error) => {
	client.logger.error(`Client error: ${error.stack ?? error}`)
}
