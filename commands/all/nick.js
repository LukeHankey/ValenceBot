import { SlashCommandBuilder } from '@discordjs/builders'
import { promisify } from 'util'

const description = ['Set the new nickname of a member']

// const data = new SlashCommandBuilder()
// 	.setName('nick')
// 	.setDescription(description[0])
// 	.addSubcommand(subcommand =>
// 		subcommand
// 			.setName('one')
// 			.setDescription('two'))
// 	.addUserOption(option =>
// 		option.setName('member')
// 			.setDescription('The member you want to change.')
// 			.setRequired(true))
// 	.addStringOption(option =>
// 		option.setName('nick')
// 			.setDescription('The new nickname')
// 			.setRequired(true));

// const data = new SlashCommandBuilder()
// 	.setName('nick')
// 	.setDescription('desc')
// 	.addSubcommand(subcommand =>
// 		subcommand
// 			.setName('sub1')
// 			.setDescription('desc'));
// 		.addChannelOption(option =>
// 			option
// 				.setName('test1')
// 				.setDescription('testing')
// 				.addChannelType(0)),
// )
// .addSubcommand(subcommand =>
// 	subcommand
// 		.setName('sub2')
// 		.setDescription('desc'),
// )
// .addSubcommandGroup(group =>
// 	group
// 		.setName('subgroup')
// 		.setDescription('desc')
// 		.addSubcommand(subcommand =>
// 			subcommand
// 				.setName('sub1')
// 				.setDescription('desc'),
// 		)
// 		.addSubcommand(subcommand =>
// 			subcommand
// 				.setName('sub2')
// 				.setDescription('desc'),
// 		)
// 		.addSubcommand(subcommand =>
// 			subcommand
// 				.setName('sub3')
// 				.setDescription('desc'),
// 		),
// );

// Non slach command object
// https://discord.com/developers/docs/interactions/application-commands#create-global-application-command
const data = {
	name: 'nick',
	description: 'Changes the nickname of the member!',
	default_permission: undefined,
	default_member_permissions: 8,
	options: [
		{
			name: 'member',
			type: 6,
			description: 'Please mention the user or try by using the id of the user!',
			required: true
		},
		{
			name: 'nick',
			type: 3,
			description: 'The new nickname!',
			required: true
		},
		{
			name: 'number',
			type: 10,
			description: 'Pick a number',
			autocomplete: true,
			required: true,
			min_value: 1,
			max_value: 100
		}
		// {
		// 	name: 'channel',
		// 	type: 7,
		// 	description: 'channel test',
		// 	required: true,
		// 	channel_types: [2],
		// },
	]
}

export default {
	name: 'nick',
	description,
	aliases: [],
	usage: ['<member> <new nickname>'],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	data,
	slash: async (interaction) => {
		const wait = promisify(setTimeout)
		await wait(3000)

		console.log(interaction)
		interaction.reply({ content: 'test', ephemeral: true }).catch(err => console.log(err, interaction))
		// const role = interaction.guild.roles.cache.find(role => role.name === 'Affiliate Events')

		// await interaction.deferReply({ allowedMentions: { parse: ['roles'] } })
		// const member = interaction.options.getMember('member')
		// const nick = interaction.options.getString('nick')
		// if (member)	member.setNickname(nick)
		// await interaction.editReply({ content: role.toString(), allowedMentions: { parse: ['roles'] } })

	}
}
