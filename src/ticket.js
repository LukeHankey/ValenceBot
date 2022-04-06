import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

export default class Ticket {
	constructor (interaction, ticketData, database) {
		this.interaction = interaction
		this.ticketData = ticketData
		this.database = database
	}

	get currentTicket () {
		const [ticket] = this.ticketData.ticket.filter(t => t.messageId === this.interaction.message.id)
		return ticket
	}

	get preference () {
		return this.currentTicket.prefer
	}

	get memberIncluded () {
		return this.currentTicket.includesMember
	}

	get roleId () {
		return this.currentTicket.role
	}

	get member () {
		return this.interaction.member
	}

	async create () {
		let newChannel
		if (this.preference === 'Threads' && this._checkThreadsPreference()) {
			newChannel = await this.interaction.channel.threads.create({
				name: `Ticket by ${this.interaction.member.displayName}`,
				autoArchiveDuration: 1440,
				type: 'GUILD_PRIVATE_THREAD',
				invitable: false,
				reason: 'Ticket for report.'
			})
		} else {
			if (this.preference === 'Threads') {
				const starter = await this.interaction.guild.members.fetch(this.currentTicket.ticketStarter)

				try {
					starter.send({ content: `Hi ${starter.displayName}, your chosen preference for tickets in ${this.currentTicket.guildName} - <#${this.currentTicket.channelId}> was \`Threads\`. However, your server does not meet the required boost level (Tier 2) for private threads so I have switched you over to \`Channels\`. If this changes in the future, you can just re-run the ticket command again.` })
				} catch (e) {
					const channels = await this.database.channels
					channels.errors.send(e)
				}

				await this.database.collection.findOneAndUpdate({ _id: this.interaction.guild.id, 'ticket.messageId': this.interaction.message.id }, {
					$set: {
						'ticket.$.prefer': 'Channels'
					}
				})
			}
			const channelPermissions = [
				// Ticket requester
				{
					id: this.interaction.member.id,
					allow: 'ViewChannel',
					type: 'member'
				},
				// Bot
				{
					id: this.interaction.message.author.id,
					allow: 'ViewChannel',
					type: 'member'
				},
				// Ticket responders
				{
					id: this.roleId,
					allow: 'ViewChannel',
					type: 'role'
				},
				// Everyone role
				{
					id: this.interaction.guild.id,
					deny: 'ViewChannel',
					type: 'role'
				}
			]
			newChannel = await this.interaction.guild.channels.create(
				`Ticket by ${this.interaction.member.displayName}`,
				{
					parent: this.interaction.channel.parentId,
					reason: 'Ticket for report.',
					permissionOverwrites: !this.memberIncluded ? channelPermissions : channelPermissions.slice(1)
				}
			)
		}

		// Brings in the user and all Staff
		this._sendInitialResponse(newChannel, this.interaction.member.id, this.memberIncluded)
		return newChannel
	}

	_checkThreadsPreference () {
		return !!['TIER_2', 'TIER_3'].includes(this.interaction.guild.premiumTier)
	}

	_sendInitialResponse (channel, memberId, included = false) {
		const resolveButton = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('Resolve Issue')
					.setLabel('Resolve Issue')
					.setStyle(ButtonStyle.Success)
					.setEmoji({ name: '❗' })
			)
		const bringUserIn = new ButtonBuilder()
			.setCustomId('Pull User In')
			.setLabel('Pull User In')
			.setStyle(ButtonStyle.Success)
			.setEmoji({ name: '📥' })

		if (!included) {
			channel.send({ content: `Hello <@!${memberId}>, a member of <@&${this.roleId}> will be with you shortly.`, components: [resolveButton] })
		} else {
			channel.send({ content: `Hello <@&${this.roleId}>! <@!${this.member.id}> has opened a ticket. If no message comes through shortly, please pull them in.`, components: [resolveButton.addComponents(bringUserIn)] })
		}
	}
}
