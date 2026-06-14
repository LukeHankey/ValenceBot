import { MessageFlags } from 'discord.js'
import Ticket from '../../ticket.js'

export const selectMenu = async (client, interaction, cache) => {
	const db = client.database.settings
	const channels = await client.database.channels

	if (interaction.guild === null) {
		// DSF Specific
		/**
		 * customId = `DM ${interaction.user.username}`
		 */
		if (interaction.customId === `DM ${interaction.user.username}`) {
			try {
				await interaction.update({ components: [] })
				const errorChannel = client.channels.cache.get('794608385106509824')
				const cachedMessageId = cache.get(interaction.user.id)
				const buttonMessage = await errorChannel.messages.fetch(cachedMessageId)
				if (interaction.values.includes('yes')) {
					await interaction.followUp({
						content: 'Thank you for responding, the log has been automatically removed.'
					})
					await buttonMessage.delete()
					await errorChannel.send({
						content: `A password was confirmed by <@!${interaction.user.id}> and the message has been deleted.`
					})
				} else {
					await interaction.followUp({ content: 'Thank you for responding.' })
					await buttonMessage.edit({ components: [] })
				}
				cache.delete(interaction.user.id)
			} catch (err) {
				channels.errors.send(err)
			}
		}
	} else if (interaction.customId === 'Ticket Category') {
		// Handle ticket category selection
		try {
			await interaction.deferUpdate()
			const ticketData = await db.findOne({ _id: interaction.guild.id }, { projection: { ticket: 1 } })
			const selectedCategory = interaction.values[0]
			const ticket = new Ticket(interaction, ticketData, db, selectedCategory)

			// Check if user already has an open ticket of this category
			const existingTicket = await ticket.hasOpenTicket()
			if (existingTicket) {
				return await interaction.followUp({
					content: `You already have an open ticket with this category at <#${existingTicket.id}>. Please close that ticket before opening a new one.`,
					flags: MessageFlags.Ephemeral
				})
			}

			const created = await ticket.create()

			// Update the message with the same components to reset the select menu
			await interaction.editReply({
				embeds: interaction.message.embeds,
				components: interaction.message.components
			})

			await interaction.followUp({
				content: `Your ticket has been created at <#${created.id}>`,
				flags: MessageFlags.Ephemeral
			})
		} catch (err) {
			channels.errors.send(err)
			await interaction
				.followUp({
					content: 'There was an error creating your ticket. Please try again or contact an administrator.',
					flags: MessageFlags.Ephemeral
				})
				.catch(() => {})
		}
	} else {
		const [...keys] = interaction.values
		for (const key of keys) {
			await db.updateOne(
				{ _id: interaction.guild.id },
				{
					$pull: {
						messageList: { key: Number(key) }
					}
				}
			)
		}
		await interaction.update({
			content: `${keys.length === 1 ? `${keys.length} entry removed.` : `${keys.length} entries removed`}`,
			components: []
		})
	}
}
