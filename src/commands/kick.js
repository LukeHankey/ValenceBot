import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageFlags, PermissionFlagsBits } from 'discord.js'

/** Why `executor` may not kick `target`, or null if they may. */
export const kickRefusal = ({ guild, executor, target }) => {
	if (!guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
		return 'I do not have permission to kick members from this server. I need the Kick Members permission.'
	}
	if (target.id === guild.ownerId) return 'You cannot kick the server owner.'
	if (target.id === executor.id) return 'You cannot kick yourself.'
	if (target.roles.highest.rawPosition > executor.roles.highest.rawPosition) {
		return 'You cannot kick someone with a higher role than you.'
	}
	if (!target.kickable) return 'I cannot kick that member: their highest role is above mine.'
	return null
}

export default {
	name: 'kick',
	description: ['Kicks a member from the server.'],
	usage: ['<member> [reason]'],
	guildSpecific: 'all',
	permissionLevel: 'Mod',
	data: new SlashCommandBuilder()
		.setName('kick')
		.setDescription('Kick a member from the server.')
		.addUserOption((o) => o.setName('member').setDescription('Member to kick (mention or ID)').setRequired(true))
		.addStringOption((o) => o.setName('reason').setDescription('Shown in the audit log')),
	slash: async (client, interaction, perms) => {
		if (!perms.mod) return interaction.reply({ ...perms.errorM, flags: MessageFlags.Ephemeral })

		const target = interaction.options.getMember('member')
		if (!target) {
			return interaction.reply({ content: 'That user is not a member of this server.', flags: MessageFlags.Ephemeral })
		}

		const refusal = kickRefusal({ guild: interaction.guild, executor: interaction.member, target })
		if (refusal) return interaction.reply({ content: `❌ ${refusal}`, flags: MessageFlags.Ephemeral })

		const reason = interaction.options.getString('reason')
		await target.kick(`Kicked by: ${interaction.member.displayName}${reason ? ` - ${reason}` : ''}`)
		return interaction.reply({ content: `✅ Kicked ${target.user.tag}.`, flags: MessageFlags.Ephemeral })
	}
}
