export const selectMenu = async (interaction, _, db, cache) => {
	const client = interaction.client
	const channels = await db.channels

	if (interaction.guild === null) {
		// DSF Specific
		/**
		 * customId = `DM ${interaction.user.username}`
		 */
		if (interaction.customId === `DM ${interaction.user.username}`) {
			try {
				await interaction.update({ components: [] })
				const errorChannel = client.channels.cache.get('794608385106509824')
				const buttonMessage = await errorChannel.messages.fetch(cache.firstKey())
				if (interaction.values.includes('yes')) {
					await interaction.followUp({ content: 'Thank you for responding, the log has been automatically removed.' })
					await buttonMessage.delete()
					await errorChannel.send({ content: `A password was confirmed by <@!${cache.first().id}> and the message has been deleted.` })
				} else {
					await interaction.followUp({ content: 'Thank you for responding.' })
					await buttonMessage.edit({ components: [] })
				}
				cache.delete(buttonMessage.id)
			} catch (err) {
				channels.errors.send(err)
			}
		}
	} else {
		const [...keys] = interaction.values
		for (const key of keys) {
			await db.collection.updateOne({ _id: interaction.guild.id },
				{
					$pull: {
						messageList: { key: Number(key) }
					}
				})
		}
		await interaction.update({ content: `${keys.length === 1 ? `${keys.length} entry removed.` : `${keys.length} entries removed`}`, components: [] })
	}
}
