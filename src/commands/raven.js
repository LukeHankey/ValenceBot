import { getRuneDate } from '../functions.js'

export default {
	name: 'raven',
	description: ['Lets you know if there is a raven today or when the next raven is.'],
	usage: [''],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	run: async (client, message, args, perms, db) => {
		const currentRunedate = getRuneDate()

		if (currentRunedate % 13 === 0) {
			await message.channel.send({ content: 'There is a raven today!' })
		} else {
			await message.channel.send({ content: `The next raven will appear in ${13 - (currentRunedate % 13)} days.` })
		}
	}
}
