import { MessageEmbed } from 'discord.js'
import { MongoCollection } from '../DataBase.js'
const randomColor = Math.floor(Math.random() * 16777215).toString(16)

const factEmbed = (factMessage) => {
	const embed = new MessageEmbed()
		.setTitle('**Daily Valence Fact**')
		.setDescription(factMessage)
		.setColor(`#${randomColor}`)
		.addField('**Sent By:**', '<@&685612946231263232>', true)
		.setTimestamp()
	return embed
}

export const sendFact = async (client) => {
	const vFactsColl = new MongoCollection('Facts')
	const count = await vFactsColl.collection.stats()
		.then(res => {
			return res.count
		})
	const random = Math.floor((Math.random() * count) + 1)

	const factDB = await vFactsColl.collection.findOne({ number: random })
	client.channels.cache.get('473235620991336468').send({ embeds: [factEmbed(factDB.Message)] })
}
