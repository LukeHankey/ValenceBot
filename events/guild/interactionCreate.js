import { MongoCollection } from '../../DataBase.js'

export default async (client, interaction) => {
	const db = new MongoCollection('Settings')
	const data = await db.collection.findOne({ _id: interaction.guildId }, { projection: { merchChannel: { components: 1, channelID: 1, otherChannelID: 1 } } })

	if (interaction.isButton()) {
		const { buttons } = await import('../../handlers/interactions/buttons.js')
		await buttons(interaction, db, data)
	} else if (interaction.isCommand()) {
		const { commands } = await import('../../handlers/interactions/commands.js')
		await commands(interaction, db, data)
	} else if (interaction.isAutocomplete()) {
		const { autoComplete } = await import('../../handlers/interactions/autoComplete.js')
		await autoComplete(interaction)
	} else if (interaction.isSelectMenu()) {
		const { selectMenu } = await import('../../handlers/interactions/selectMenu.js')
		await selectMenu(interaction, data, db)
	} else if (interaction.isContextMenu()) {
		const client = interaction.client
		const command = client.commands.get(interaction.commandName)

		await command.menu(interaction, data, db)
	}
}
