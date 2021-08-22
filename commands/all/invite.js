/* eslint-disable no-inline-comments */
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { cyan } = require('../../colors.json');

const data = new SlashCommandBuilder()
	.setName('invite')
	.setDescription('Invite the bot to your server.');

module.exports = {
	name: 'invite',
	description: ['Provides a link to invite the bot to your server.'],
	aliases: [],
	usage: [''],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	data,
	slash: async (interaction) => {
		const invite = interaction.client.generateInvite({ scopes: ['bot', 'applications.commands'], permissions: 123212262595n });
		const embed = new MessageEmbed().setTitle('Here is your invite link.').setURL(invite).setColor(cyan);
		await interaction.reply({ embeds: [embed], ephemeral: true });
	},
};