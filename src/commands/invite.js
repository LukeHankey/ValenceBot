import { SlashCommandBuilder } from '@discordjs/builders'
import { EmbedBuilder, MessageFlags } from 'discord.js'
import Color from '../colors.js'

const data = new SlashCommandBuilder().setName('invite').setDescription('Invite the bot to your server.')

export default {
	name: 'invite',
	description: ['Provides a link to invite the bot to your server.'],
	usage: [''],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	data,
	slash: async (client, interaction, _) => {
		const invite = client.generateInvite({
			scopes: ['bot', 'applications.commands'],
			permissions: 123212262595n
		})
		const embed = new EmbedBuilder().setTitle('Here is your invite link.').setURL(invite).setColor(Color.cyan)
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
	}
}
