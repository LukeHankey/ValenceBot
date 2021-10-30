import { MessageEmbed } from 'discord.js'
import { orange } from '../../colors.js'

export default {
	name: 'vote',
	description: ['Poll a message in which people can react with ✅ or ❌ or ❓.'],
	aliases: [],
	usage: ['<question>'],
	guildSpecific: 'all',
	permissionLevel: 'Mod',
	run: async (client, message, args, perms, channels) => {
		if (!perms.mod) return message.channel.send(perms.errorM)
		const content = args.join(' ')

		const embed = new MessageEmbed()
			.setTitle('New Vote!')
			.setDescription(`${content}`)
			.setColor(orange)
			.setTimestamp()

		message.delete()
		message.channel.send({ embeds: [embed] }).then(async m => {
			await m.react('✅')
			await m.react('❌')
			await m.react('❓')
		})
			.catch(err => {
				channels.errors.send(err, module)
			})
	}
}
