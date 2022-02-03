import { MessageActionRow, MessageButton } from 'discord.js'

export default class Ticket {
	constructor (interaction, database) {
		this.interaction = interaction
		this.database = database
		this.moderator = interaction.guild.roles.cache.find(r => r.name === 'Staff')
	}

	async create () {
		const thread = await this.interaction.channel.threads.create({
			name: `Ticket by ${this.interaction.member.displayName}`,
			autoArchiveDuration: 1440,
			type: 'GUILD_PRIVATE_THREAD',
			invitable: false,
			reason: 'Ticket for report.'
		})

		// Brings in the user and all Staff
		this._sendInitialResponse(thread, this.interaction.member.id)
		return thread
	}

	_sendInitialResponse (thread, memberId) {
		const resolveButton = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId('Resolve Issue')
					.setLabel('Resolve Issue')
					.setStyle('SUCCESS')
					.setEmoji('❗')
			)

		thread.send({ content: `Hello <@!${memberId}>, a member of <@&${this.moderator.id}> will be with you shortly.`, components: [resolveButton] })
	}
}
