import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageFlags } from 'discord.js'
import Color from '../colors.js'
import { nEmbed, capitalise } from '../functions.js'

const LEVELS = { Everyone: 0, Mod: 1, Admin: 2, Owner: 3 }

/** The highest permission level `perms` grants, as in LEVELS. */
const levelOf = (perms) => (perms.owner ? 3 : perms.admin ? 2 : perms.mod ? 1 : 0)

/**
 * Names of the slash commands in this guild that `perms` may use.
 *
 * Prefix-only commands are left out: they no longer receive message content,
 * so listing them would advertise commands that cannot work.
 */
export const visibleCommands = (commands, guildId, perms) =>
	[...commands.values()]
		.filter((c) => c.slash && (c.guildSpecific === 'all' || c.guildSpecific.includes(guildId)))
		.filter((c) => (LEVELS[c.permissionLevel] ?? 0) <= levelOf(perms))
		.map((c) => c.name)
		.sort()

export default {
	name: 'help',
	description: ['Lists the commands you can use, or shows how to use one of them.'],
	usage: ['[command]'],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('List my commands, or show how to use one.')
		.addStringOption((o) => o.setName('command').setDescription('Command to explain').setAutocomplete(true)),
	slash: async (client, interaction, perms) => {
		const name = interaction.options.getString('command')
		const avatar = interaction.user.displayAvatarURL()
		const botAvatar = client.user.displayAvatarURL()

		if (!name) {
			const names = visibleCommands(client.commands, interaction.guildId, perms)
			return interaction.reply({
				embeds: [
					nEmbed('**Help Commands List**', "Here's a list of my commands:", Color.cyan, avatar, botAvatar).addFields(
						{
							name: '**Slash Commands (/):**',
							value: names.map((n) => `\`${n}\``).join(' | ') || 'None',
							inline: false
						},
						{
							name: '​',
							value: 'Use `/help command:` to get info on a specific command.\n\n[Privacy Policy](https://github.com/LukeHankey/ValenceBot/blob/main/PRIVACY_POLICY.md) | [Terms of Service](https://github.com/LukeHankey/ValenceBot/blob/main/TOS.md)',
							inline: false
						}
					)
				]
			})
		}

		const command = client.commands.get(name)
		if (!command?.slash) {
			return interaction.reply({ content: `There is no \`/${name}\` command.`, flags: MessageFlags.Ephemeral })
		}

		const fields = command.usage.map((usage, i) => ({
			name: `🔹 /${command.name} ${usage || ''}`,
			value: `${command.description[i] ?? command.description[0]}`,
			inline: false
		}))

		return interaction.reply({
			embeds: [
				nEmbed(
					`**Command:** ${capitalise(command.name)}`,
					`**Permission Level:** ${command.permissionLevel}\n**Usage:**`,
					Color.aqua,
					avatar,
					botAvatar
				).addFields(fields)
			]
		})
	}
}
