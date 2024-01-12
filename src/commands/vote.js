import { EmbedBuilder } from 'discord.js'
import Color from '../colors.js'

export default {
	name: 'vote',
	description: ['Poll a message in which people can react with ✅ or ❌ or ❓.'],
	usage: ['<question>'],
	guildSpecific: 'all',
	permissionLevel: 'Mod',
	run: async (client, message, args, perms) => {
		if (!perms.mod) return message.channel.send(perms.errorM)
		const channels = client.database.channels
		const content = args.join(' ')
		if (!content) return message.channel.send({ content: 'Add some context regarding the vote.' })

		const embed = new EmbedBuilder().setTitle('New Vote!').setDescription(`${content}`).setColor(Color.orange).setTimestamp()

		message.delete()
		message.channel
			.send({ embeds: [embed] })
			.then(async (m) => {
				await m.react('✅')
				await m.react('❌')
				await m.react('❓')
			})
			.catch(async (err) => channels.errors.send(err))
	}
}
