import { SlashCommandBuilder } from '@discordjs/builders'
import { EmbedBuilder, MessageFlags, codeBlock } from 'discord.js'
import { splitMessage } from '../functions.js'

/**
 * 668330890790699079 - Valence Bot Test
 * 472448603642920973 - Valence
 */

const randomColor = () => Math.floor(Math.random() * 16777215).toString(16)

/**
 * Delete fact `number` and close the gap in the numbering.
 *
 * The prefix command renumbered first and then deleted by number, so for a
 * moment two facts shared that number and the delete could remove the wrong
 * one. Delete the exact document, then renumber.
 */
export const removeFact = async (facts, number) => {
	const fact = await facts.findOne({ number })
	if (!fact) return null
	await facts.deleteOne({ _id: fact._id })
	await facts.updateMany({ number: { $gt: number } }, { $inc: { number: -1 } })
	return fact
}

export default {
	name: 'fact',
	description: [
		'Posts a random Valence fact in this channel.',
		'Adds a Valence fact.',
		'Removes a fact by its number.',
		'Replaces the text of a fact by its number.',
		'Shows the entire list of facts.'
	],
	usage: ['show', 'add <fact>', 'remove <number>', 'edit <number> <fact>', 'list'],
	guildSpecific: ['668330890790699079', '472448603642920973'],
	permissionLevel: 'Mod',
	data: new SlashCommandBuilder()
		.setName('fact')
		.setDescription('Valence facts.')
		.addSubcommand((sub) => sub.setName('show').setDescription('Post a random fact in this channel.'))
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Add a fact.')
				.addStringOption((o) => o.setName('fact').setDescription('The fact').setRequired(true))
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Remove a fact.')
				.addIntegerOption((o) => o.setName('number').setDescription('Fact number').setMinValue(1).setRequired(true))
		)
		.addSubcommand((sub) =>
			sub
				.setName('edit')
				.setDescription('Replace the text of a fact.')
				.addIntegerOption((o) => o.setName('number').setDescription('Fact number').setMinValue(1).setRequired(true))
				.addStringOption((o) => o.setName('fact').setDescription('The new text').setRequired(true))
		)
		.addSubcommand((sub) => sub.setName('list').setDescription('Show every fact.')),
	slash: async (client, interaction, perms) => {
		const channels = await client.database.channels
		const facts = client.database.facts
		const subcommand = interaction.options.getSubcommand()
		const user = `<@${interaction.user.id}>`

		if (subcommand === 'list') {
			if (!perms.mod) return interaction.reply({ ...perms.errorM, flags: MessageFlags.Ephemeral })
			const list = (await facts.find({}).sort({ number: 1 }).toArray()).map((f) => `${f.number}. ${f.Message}\n`)
			if (!list.length) return interaction.reply({ content: 'There are no facts yet.', flags: MessageFlags.Ephemeral })
			const [first, ...rest] = splitMessage(list.join(''))
			await interaction.reply({ content: codeBlock(first), flags: MessageFlags.Ephemeral })
			for (const chunk of rest) await interaction.followUp({ content: codeBlock(chunk), flags: MessageFlags.Ephemeral })
			return
		}

		if (!perms.admin) return interaction.reply({ ...perms.errorA, flags: MessageFlags.Ephemeral })

		switch (subcommand) {
			case 'show': {
				const [fact] = await facts.aggregate([{ $sample: { size: 1 } }]).toArray()
				if (!fact) return interaction.reply({ content: 'There are no facts yet.', flags: MessageFlags.Ephemeral })
				const embed = new EmbedBuilder()
					.setTitle('**Daily Valence Fact**')
					.setDescription(fact.Message)
					.setColor(`#${randomColor().padStart(6, '0')}`)
					.addFields({ name: '**Sent By:**', value: '<@&685612946231263232>', inline: true })
					.setTimestamp()
				const sent = await interaction.reply({ embeds: [embed], withResponse: true })
				return channels.logs.send(
					`${user} used the Fact command in <#${interaction.channelId}>. ${sent.resource.message.url} ${codeBlock(
						`#${fact.number}. ${fact.Message}`
					)}`
				)
			}
			case 'add': {
				const text = interaction.options.getString('fact')
				const number = (await facts.countDocuments()) + 1
				await facts.insertOne({ Message: text, number })
				await interaction.reply({
					content: `Fact #${number} has been added to the list!\n${codeBlock(`${number}. ${text}`)}`
				})
				return channels.logs.send(`${user} added a Fact: ${codeBlock(`#${number}. ${text}`)}`)
			}
			case 'remove': {
				const number = interaction.options.getInteger('number')
				const removed = await removeFact(facts, number)
				if (!removed) return interaction.reply({ content: `There is no fact #${number}.`, flags: MessageFlags.Ephemeral })
				await interaction.reply({
					content: `Fact #${number} has been deleted from the list!\n${codeBlock(`${number}. ${removed.Message}`)}`
				})
				return channels.logs.send(`${user} removed a Fact: ${codeBlock(`#${number}. ${removed.Message}`)}`)
			}
			case 'edit': {
				const number = interaction.options.getInteger('number')
				const text = interaction.options.getString('fact')
				const before = await facts.findOneAndUpdate({ number }, { $set: { Message: text } }, { returnDocument: 'before' })
				if (!before) return interaction.reply({ content: `There is no fact #${number}.`, flags: MessageFlags.Ephemeral })
				await interaction.reply({
					content: `Fact #${number} has been edited successfully!\n${codeBlock(`${number}. ${before.Message} >>> ${text}`)}`
				})
				return channels.logs.send(
					`${user} edited Fact #${number}: ${codeBlock('diff', `- ${before.Message}\n+ ${text}`)}`
				)
			}
		}
	}
}
