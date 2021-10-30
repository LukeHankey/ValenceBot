import { SlashCommandBuilder } from '@discordjs/builders'

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
		.addIntegerOption(option =>
			option.setName('value')
				.setDescription('The number of messages to delete.')
				.setRequired(true)),
	slash: async (interaction, _, channels) => {
		const int = interaction.options.getInteger('value')

		if (int > 100 || int < 1) {
			return interaction.reply({ content: 'Number must be between 1 and 100.', ephemeral: true })
		}

		try {
			interaction.channel.bulkDelete(int, true)
			return interaction.reply({ content: `${int} ${int === 1 ? 'message has' : 'messages have'} been deleted`, ephemeral: true })
		} catch (err) {
			interaction.channel.send({ content: 'There was an error trying to delete messages in this channel since they are older than 2 weeks.', ephemeral: true })
			channels.errors.send(err)
		}
	}
}
