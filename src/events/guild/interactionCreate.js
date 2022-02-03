import { MongoCollection } from '../../DataBase.js'
import { Collection } from 'discord.js'
import { buttons, commands, autoComplete, selectMenu} from '../../handlers/interactions/index.js'

const cache = new Collection()

export default async (client, interaction) => {
	const db = new MongoCollection('Settings')
	const data = await db.collection.findOne({ _id: interaction.guildId }, { projection: { merchChannel: { components: 1, channelID: 1, otherChannelID: 1, deletions: 1 } } })

	if (interaction.isButton()) {
		await buttons(interaction, db, data, cache)
	} else if (interaction.isCommand()) {
		await commands(interaction, db, data)
	} else if (interaction.isAutocomplete()) {
		await autoComplete(interaction)
	} else if (interaction.isSelectMenu()) {
		await selectMenu(interaction, data, db, cache)
	} else if (interaction.isContextMenu()) {
		const command = client.commands.get(interaction.commandName)

		await command.menu(interaction, data, db)
	}
}
