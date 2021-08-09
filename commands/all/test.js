import { WebhookClient } from 'discord.js'

export default {
	name: 'test',
	description: ['test'],
	aliases: [],
	usage: ['<user ID> <message>'],
	guildSpecific: 'all',
	permissionLevel: 'Owner',
	run: async (client, message, args, perms, db) => {
		// const webhookData = await message.channel.createWebhook('test')
		const webhookData = await message.channel.fetchWebhooks()
		const webhook = webhookData.first()
		console.log(webhook)
		const { id, token, url } = webhook
		try {
			webhook.send({ content: '@everyone', allowedMentions: { parse: [] } })
		} catch (err) {
			const web = new WebhookClient({ id, token, url })
			web.send({ content: '@everyone', allowedMentions: { parse: [] } })
		}
	}
}
