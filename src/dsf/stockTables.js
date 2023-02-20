export const updateStockTables = async (client, db) => {
	const commandCollection = client.commands.filter((cmd) => cmd.name === 'stock')
	const commands = commandCollection.first()

	client.logger.info('Updating stock tables.')
	await commands.run(client, null, ['update'], { bot: true }, db)
	client.logger.info('Stock tables have been updated.')
}
