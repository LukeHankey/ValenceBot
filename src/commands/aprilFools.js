import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

export default {
	name: 'afool',
	description: ['Evaluates code.'],
	aliases: [''],
	usage: ['<code>'],
	guildSpecific: ['668330890790699079', '420803245758480405'],
	permissionLevel: 'Owner',
	run: async (client, message, args, perms, db) => {
		const channels = await db.channels
		if (!perms.owner) {
			return message.channel.send(perms.errorO)
		}
		const button = new ActionRowBuilder().addComponents([
			new ButtonBuilder()
				.setCustomId('Jagex-DSF Scouting Partnership')
				.setLabel('Jagex-DSF Scouting Partnership')
				.setStyle(ButtonStyle.Danger)
				.setEmoji({ name: '💰' })
		])

		await message.channel.send({
			content:
				"Private video discussion between DSF Generals and JaGeX Employees on financing DSF scouters. Please don't share this link outside this chat! Skip to the last 4 minutes for a summary.",
			components: [button]
		})
	}
}
