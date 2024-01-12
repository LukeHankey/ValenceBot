import { EmbedBuilder } from 'discord.js'
const randomColor = Math.floor(Math.random() * 16777215).toString(16)

const factEmbed = (factMessage) => {
	const embed = new EmbedBuilder()
		.setTitle('**Daily Valence Fact**')
		.setDescription(factMessage)
		.setColor(`#${randomColor}`)
		.addFields({ name: '**Sent By:**', value: '<@&685612946231263232>', inline: true })
		.setTimestamp()
	return embed
}

export const sendFact = async (client) => {
	const vFactsColl = client.database.facts
	const count = await vFactsColl.stats().then((res) => {
		return res.count
	})
	const random = Math.floor(Math.random() * count + 1)

	const factDB = await vFactsColl.findOne({ number: random })
	client.channels.cache.get('473235620991336468').send({ embeds: [factEmbed(factDB.Message)] })
}
