import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageEmbed } from 'discord.js'
import { cyan } from '../colors.js'

const data = new SlashCommandBuilder()
	.setName('invite')
	.setDescription('Invite the bot to your server.')

export default {
	name: 'invite',
	description: ['Provides a link to invite the bot to your server.'],
	aliases: [],
	usage: [''],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	data,
	slash: async (interaction) => {
		const invite = interaction.client.generateInvite({ scopes: ['bot', 'applications.commands'], permissions: 123212262595n })
		const embed = new MessageEmbed().setTitle('Here is your invite link.').setURL(invite).setColor(cyan)
		await interaction.reply({ embeds: [embed], ephemeral: true })
	}
}
