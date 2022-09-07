import { MongoCollection } from '../../DataBase.js'
import { Collection } from 'discord.js'
import { buttons, commands, autoComplete, selectMenu, modals, contextMenu } from '../../handlers/interactions/index.js'

const cache = new Collection()

export default async (client, interaction) => {
	const db = new MongoCollection('Settings')
	const data = await db.collection.findOne({ _id: interaction.guildId }, { projection: { merchChannel: { components: 1, channelID: 1, otherChannelID: 1, deletions: 1 } } })

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
			await interaction.deferReply({ ephemeral: true })
			await contextMenu(interaction, db, data)
		} else if (interaction.isModalSubmit()) {
			await modals(interaction, db, data)
		}
	} catch (err) {
		const channels = await db.channels
		console.log(err)
		channels.errors.send(err)
	}
}
