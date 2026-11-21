import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageFlags } from 'discord.js'

export default {
	name: 'reply',
	description: ['Replies to a user who DMed the bot.'],
	usage: ['<user> <message>'],
	guildSpecific: '668330890790699079',
	permissionLevel: 'Owner',
	data: new SlashCommandBuilder()
		.setName('reply')
		.setDescription('Reply to a user who DMed the bot.')
		.addUserOption((o) => o.setName('user').setDescription('Who to reply to (mention or ID)').setRequired(true))
		.addStringOption((o) => o.setName('message').setDescription('What to send').setRequired(true)),
	slash: async (client, interaction, perms) => {
		if (!perms.owner) return interaction.reply({ ...perms.errorO, flags: MessageFlags.Ephemeral })

		const user = interaction.options.getUser('user')
		try {
			await user.send({ content: interaction.options.getString('message') })
		} catch (err) {
			// 50007: the user does not accept DMs from the bot.
			if (err.code !== 50007) throw err
			return interaction.reply({ content: `Could not DM ${user.tag}: ${err.message}`, flags: MessageFlags.Ephemeral })
		}
		return interaction.reply({ content: `✅ Sent to ${user.tag}.`, flags: MessageFlags.Ephemeral })
	}
}
