import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js'

export default class Ticket {
	constructor(interaction, ticketData, database, category = null) {
		this.interaction = interaction
		this.ticketData = ticketData
		this.database = database
		this.category = category
	}

	get currentTicket() {
		const [ticket] = this.ticketData.ticket.filter((t) => t.messageId === this.interaction.message.id)
		return ticket
	}

	get preference() {
		return this.currentTicket.prefer
	}

	get roleId() {
		return this.currentTicket.role
	}

	get member() {
		return this.interaction.member
	}

	isApplication() {
		return this.currentTicket.application
	}

	async hasOpenTicket() {
		const guild = this.interaction.guild
		const memberId = this.member.id
		const preference = this.preference
		const userDisplayName = this.member.displayName.toLowerCase()
		const ticketPrefix = this.isApplication() ? 'application' : 'ticket'

		// Search based on preference
		if (preference === 'Threads') {
			const threads = this.interaction.channel.threads.cache
			// Check all threads in the current channel
			if (threads.size === 0) return null

			// Find all matching threads for this user
			const matchingThreads = threads.filter((thread) => {
				if (thread.type !== ChannelType.PrivateThread || thread.archived || thread.locked) return false

				const threadName = thread.name.toLowerCase()
				return threadName.includes(ticketPrefix) && threadName.includes(userDisplayName)
			})

			if (matchingThreads.size === 0) return null

			// For applications, just return the first thread (user isn't a member)
			if (this.isApplication()) {
				return matchingThreads.first()
			}

			// For regular tickets, check each thread for category match
			for (const [, thread] of matchingThreads) {
				try {
					const members = await thread.members.fetch()
					if (!members.has(memberId)) continue

					// If no category specified, any open ticket counts
					if (!this.category) return thread

					// Check if category matches by fetching starter message
					const initialMessage = await thread.fetchStarterMessage()
					if (initialMessage && initialMessage.content.includes(`**Category:** ${this.category}`)) {
						return thread
					}
				} catch (e) {
					continue
				}
			}

			return null
		} else {
			// Channels preference - check all channels in the same parent
			const ticketChannel = guild.channels.cache.get(this.currentTicket.channelId)
			if (!ticketChannel) return null

			const parentId = ticketChannel.parentId

			// Find all matching channels for this user
			const matchingChannels = guild.channels.cache.filter((channel) => {
				if (channel.type !== ChannelType.GuildText || channel.parentId !== parentId) return false

				const channelName = channel.name.toLowerCase()
				return channelName.includes(ticketPrefix) && channelName.includes(userDisplayName)
			})

			if (matchingChannels.size === 0) return null

			// For applications, just return the first channel (user doesn't have permissions)
			if (this.isApplication()) {
				return matchingChannels.first()
			}

			// For regular tickets, check each channel for category match
			for (const [, channel] of matchingChannels) {
				try {
					// Check if ticket has been closed by checking the button text
					const pinnedMessages = await channel.messages.fetchPinned()
					const initialMessage = pinnedMessages.first()

					// If the button says "Issue resolved", the ticket is closed
					if (initialMessage?.components?.[0]?.components?.[0]?.data?.label === 'Issue resolved') {
						continue
					}

					// Check if user has ViewChannel permission (for open tickets)
					const hasAccess = channel.permissionOverwrites.cache.has(memberId)
					if (!hasAccess) continue

					const perms = channel.permissionOverwrites.cache.get(memberId)
					if (!perms.allow.has('ViewChannel')) continue

					// If no category specified, any open ticket counts
					if (!this.category) return channel

					// Check if category matches
					if (initialMessage && initialMessage.content.includes(`**Category:** ${this.category}`)) {
						return channel
					}
				} catch (e) {
					continue
				}
			}

			return null
		}
	}

	async create() {
		let newChannel
		if (this.preference === 'Threads' && this._checkThreadsPreference()) {
			newChannel = await this.interaction.channel.threads.create({
				name: `${this.isApplication() ? 'Application' : 'Ticket'} by ${this.interaction.member.displayName}`,
				autoArchiveDuration: 1440,
				type: ChannelType.PrivateThread,
				invitable: false,
				reason: !this.isApplication() ? 'Ticket for report.' : 'Application'
			})
		} else {
			if (this.preference === 'Threads') {
				const starter = await this.interaction.guild.members.fetch(this.currentTicket.ticketStarter)

				try {
					starter.send({
						content: `Hi ${starter.displayName}, your chosen preference for tickets in ${this.currentTicket.guildName} - <#${this.currentTicket.channelId}> was \`Threads\`. However, your server does not meet the required boost level (Tier 2) for private threads so I have switched you over to \`Channels\`. If this changes in the future, you can just re-run the ticket command again.`
					})
				} catch (e) {
					const channels = await this.database.channels
					channels.errors.send(e)
				}

				await this.database.collection.findOneAndUpdate(
					{ _id: this.interaction.guild.id, 'ticket.messageId': this.interaction.message.id },
					{
						$set: {
							'ticket.$.prefer': 'Channels'
						}
					}
				)
			}
			const permissionOverwrites = [
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
			newChannel = await this.interaction.guild.channels.create({
				name: `${this.isApplication() ? 'Application' : 'Ticket'} by ${this.interaction.member.displayName}`,
				parent: this.interaction.channel.parentId,
				reason: !this.isApplication() ? 'Ticket for report.' : 'Application',
				permissionOverwrites: this.isApplication() ? permissionOverwrites.slice(1) : permissionOverwrites
			})
		}

		// Brings in the user and all Staff
		await this._sendInitialResponse(newChannel, this.interaction.member.id)
		return newChannel
	}

	_checkThreadsPreference() {
		return !![2, 3].includes(this.interaction.guild.premiumTier)
	}

	async _sendInitialResponse(channel, memberId) {
		const resolveButton = new ActionRowBuilder().addComponents([
			new ButtonBuilder()
				.setCustomId('Close Ticket')
				.setLabel('Close Ticket')
				.setStyle(ButtonStyle.Success)
				.setEmoji({ name: '❗' })
		])

		if (!this.isApplication()) {
			const categoryText = this.category ? `**Category:** ${this.category}\n\n` : ''
			const msg = await channel.send({
				content: `${categoryText}Hello <@!${memberId}>, a member of <@&${this.roleId}> will be with you shortly.`,
				components: [resolveButton]
			})
			await msg.pin()
		} else {
			const msg = await channel.send({
				content: `Hello <@&${this.roleId}>, ${this.interaction.member.displayName} (${memberId}) has submitted a new application! Please review and get back to them ASAP. They have been notified that their application is in review.`
			})
			await msg.react('✅')
			await msg.react('❌')
		}
	}
}
