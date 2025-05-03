import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageFlags } from 'discord.js'

export default {
	name: 'delete',
	description: ['Deletes a number of previous messages in the current channel.'],
	aliases: ['del'],
	usage: ['<number>'],
	guildSpecific: 'all',
	permissionLevel: 'Mod',
	data: new SlashCommandBuilder()
		.setName('delete')
		.setDescription('Deletes a number of previous messages in the current channel.')
		.setDefaultPermission(false)
		.addIntegerOption((option) =>
			option.setName('value').setDescription('The number of messages to delete.').setRequired(true)
		),
	slash: async (client, interaction, _) => {
		const int = interaction.options.getInteger('value')
		const channels = await client.database.channels

		if (int > 100 || int < 1) {
			return interaction.reply({ content: 'Number must be between 1 and 100.', flags: MessageFlags.Ephemeral })
		}

		try {
			interaction.channel.bulkDelete(int, true)
			return interaction.reply({
				content: `${int} ${int === 1 ? 'message has' : 'messages have'} been deleted`,
				flags: MessageFlags.Ephemeral
			})
		} catch (err) {
			interaction.channel.send({
				content: 'There was an error trying to delete messages in this channel since they are older than 2 weeks.',
				flags: MessageFlags.Ephemeral
			})
			channels.errors.send(err)
		}
	}
}
