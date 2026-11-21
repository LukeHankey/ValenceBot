import { buttons, commands, autoComplete, selectMenu, modals, contextMenu } from '../../handlers/interactions/index.js'
import { MessageFlags } from 'discord.js'

const cache = new Map()

export default async (client, interaction) => {
	// Global commands can be run in DMs, or in a server that added the app
	// without the bot user. There is no guild or channel to work with there,
	// which is what crashed autoComplete.js and commands.js.
	if (!interaction.inCachedGuild()) {
		if (interaction.isAutocomplete()) return interaction.respond([])
		if (interaction.isRepliable()) {
			return interaction.reply({
				content: 'Valence Bot only works inside a server it has been added to.',
				flags: MessageFlags.Ephemeral
			})
		}
		return
	}

	const db = client.database.settings
	const data = await db.findOne(
		{ _id: interaction.guildId },
		{ projection: { eventChannel: { components: 1, otherChannelID: 1, deletions: 1 } } }
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
			await interaction.deferReply({ flags: MessageFlags.Ephemeral })
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
