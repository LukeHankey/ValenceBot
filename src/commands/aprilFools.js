import { ActionRowBuilder, ButtonBuilder, ButtonStyle, codeBlock } from 'discord.js'
import { splitMessage } from '../functions.js'

export default {
	name: 'afool',
	description: ['Evaluates code.'],
	aliases: [''],
	usage: ['<code>'],
	guildSpecific: ['668330890790699079', '420803245758480405'],
	permissionLevel: 'Owner',
	run: async (client, message, args, perms, db) => {
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

		if (!args.length) {
			await message.channel.send({
				content:
					"Private video discussion between DSF Generals and JaGeX Employees on financing DSF scouters. Please don't share this link outside this chat! Skip to the last 4 minutes for a summary.",
				components: [button]
			})
		}

		if (args[0] === 'stats') {
			const { aprilFools } = await db.collection.findOne({ _id: message.guild.id }, { projection: { aprilFools: 1 } })
			const count = aprilFools.count
			const names = aprilFools.fools.map((fool) => {
				return `${message.guild.members.cache.get(fool).displayName} - ${fool}`
			})
			const split = splitMessage(`${names.join('\n')}`)
			return split.forEach(
				async (content) =>
					await message.channel.send({
						content: `There are a total of ${names.length} Deep Sea Fishers fooled ${count} times!\n\n${codeBlock(
							content
						)}`
					})
			)
		}
	}
}
