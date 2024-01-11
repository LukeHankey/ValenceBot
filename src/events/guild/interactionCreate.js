import { buttons, commands, autoComplete, selectMenu, modals, contextMenu } from '../../handlers/interactions/index.js'

const cache = new Map()

export default async (client, interaction) => {
	const db = client.database.settings
	const data = await db.findOne(
		{ _id: interaction.guildId },
		{ projection: { merchChannel: { components: 1, channelID: 1, otherChannelID: 1, deletions: 1 } } }
	)

	try {
		if (interaction.isButton()) {
			await buttons(client, interaction, data, cache)
		} else if (interaction.isChatInputCommand()) {
			await commands(client, interaction, data)
		} else if (interaction.isAutocomplete()) {
			await autoComplete(interaction)
		} else if (interaction.isStringSelectMenu()) {
			await selectMenu(client, interaction, cache)
		} else if (interaction.isContextMenuCommand()) {
			await interaction.deferReply({ ephemeral: true })
			await contextMenu(client, interaction, data)
		} else if (interaction.isModalSubmit()) {
			await modals(client, interaction)
		}
	} catch (err) {
		const channels = await client.database.channels
		client.logger.debug(`${interaction} \nError in interactionCreate.`)
		channels.errors.send(err)
	}
}
