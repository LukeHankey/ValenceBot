import { MongoCollection } from '../../DataBase.js'
import { Collection } from 'discord.js'
import { buttons, commands, autoComplete, selectMenu, modals, contextMenu } from '../../handlers/interactions/index.js'

const cache = new Collection()

export default async (client, interaction) => {
	const start = performance.now()
	const db = new MongoCollection('Settings')
	const data = await db.collection.findOne(
		{ _id: interaction.guildId },
		{ projection: { merchChannel: { components: 1, channelID: 1, otherChannelID: 1, deletions: 1 } } }
	)

	try {
		if (interaction.isButton()) {
			await buttons(interaction, db, data, cache)
		} else if (interaction.isChatInputCommand()) {
			await commands(interaction, db, data)
		} else if (interaction.isAutocomplete()) {
			await autoComplete(interaction)
		} else if (interaction.isSelectMenu()) {
			await selectMenu(interaction, db, data, cache)
		} else if (interaction.isContextMenuCommand()) {
			client.logger.debug(`Before defer ${performance.now() - start}`)
			await interaction.deferReply({ ephemeral: true })
			client.logger.debug(`After defer ${performance.now() - start}`)
			await contextMenu(interaction, db, data)
		} else if (interaction.isModalSubmit()) {
			await modals(interaction, db, data)
		}
	} catch (err) {
		const channels = await db.channels
		client.logger.debug(`${interaction} \nError in interactionCreate.`)
		channels.errors.send(err)
	}
}
