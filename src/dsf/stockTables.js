export const updateStockTables = async (client, db) => {
	const commandCollection = client.commands.filter((cmd) => cmd.name === 'stock')
	const commands = commandCollection.first()

	client.logger.info('Updating stock tables.')
	await commands[0].run(client, null, ['update'], null, db)
}
