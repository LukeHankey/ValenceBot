import Color from '../../colors.js'
import { EmbedBuilder } from 'discord.js'

export default async (client, message) => {
	// Handling DMs
	if (message.guild === null || message.channel.type === 'DM') {
		if (message.partial) await message.fetch()
		const dm = message.channel
		let dmMessages = await dm.messages.fetch({ limit: 1 })
		const dmPerson = dm.recipient // User object
		const dmMsg = []
		dmMessages = [...dmMessages.values()]

		for (const val in dmMessages) {
			if (dmMessages[val].author.id === '668330399033851924') return
			dmMsg.push(dmMessages[val].content)
		}

		const embed = new EmbedBuilder()
			.setTitle('New DM Recieved')
			.setDescription(`${dmPerson.tag} sent me a DM.`)
			.setColor(Color.blueDark)
			.addFields(
				{ name: 'User ID', value: `${dmPerson.id}`, inline: false },
				{ name: 'Message contents', value: `${dmMsg.join('\n')}` }
			)
			.setTimestamp()

		return client.channels.cache.get('788525524782940187').send({ embeds: [embed] })
	}

	// Nothing else here reads messages. ValenceBot no longer receives message
	// content outside DMs, so prefix commands are gone (everything is a slash
	// command) and #dsf-calls is handled by DSFMessaging (src/messaging).
}
