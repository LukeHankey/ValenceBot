const getDb = require('../../mongodb').getDb;
const { MessageEmbed } = require('discord.js');
const { checkNum, renameKeys } = require('../../functions');
const{ green_light, red_light } = require('../../colors.json');
const { getData } = require('../../valence/clanData');

module.exports = {
	name: 'user',
	description: ['Lookup a clan member by Discord ID.', '~~Lookup a group of ranks.~~', 'Lookup a clan member by their RSN.', 'Set the Discord ID/Active/Alt status of a clan member.'],
	aliases: [''],
	usage:  ['<Discord ID>', '<Rank name>', '<RSN>', '<RSN> set <discord/active/alt> <new value>'],
	guildSpecific: ['472448603642920973', '733164313744769024' ],
	permissionLevel: 'Mod',
	run: async (client, message, args, perms) => {
		if (!perms.owner) return message.channel.send(perms.errorM);
		const db = getDb();
		const usersColl = db.collection('Users');
		const ranks = [ 'recruit', 'corporal', 'sergeant', 'lieutenant', 'captain', 'general', 'admin', 'organiser', 'coordinator', 'overseer', 'deputy owner', 'owner' ];

		/**
         * Goals:
         * Find one person > Show all data + explanation
         * Find by rank
         * Set one persons' discord, active, alt.
         */
		const createEmbedForDB = async (user, { inDisc, type }, fields, desc = '') => {
			let member;
			if (type === 'id') {
				if (user.discord !== '' && inDisc) {
					member = message.guild.members.cache.get(user['Discord ID']) ?? await message.guild.members.fetch(user['Discord ID']);
				}
			}
			else if (type === 'rsn') {
				if (user.discord !== '' && user.discActive) {
					member = message.guild.members.cache.get(user['Discord ID']) ?? await message.guild.members.fetch(user['Discord ID']);
				}
			}
			else { return; }

			const embed = new MessageEmbed()
				.setTitle(`User Profile - ${user.RSN}`)
				.setThumbnail(member ? member.user.displayAvatarURL() : message.guild.iconURL())
				.setTimestamp()
				.setDescription(desc)
				.setColor(green_light)
				.setFooter('If any of the data above is wrong, please update it.')
				.addFields(fields);
			return message.channel.send(embed);
		};

		const createEmbedForNoDB = async (mem, desc) => {
			let member;
			if (!desc) member = await message.guild.members.fetch(mem);
			const embed = new MessageEmbed()
				.setTitle('User Profile - Not Found')
				.setDescription(desc ? desc : `User with Discord ID: ${mem} not found but they are in the Discord as ${member.toString()}.`)
				.setColor(red_light)
				.setTimestamp();
			return message.channel.send(embed);
		};
		const result = [];

		if (args.length === 1 && checkNum(args[0], 1, Infinity)) {
			// Discord ID
			const userInDiscord = message.guild.members.cache.has(args[0]);
			let findUser = await usersColl.findOne({ discord: args[0] }, { projection: { _id: 0, kills: 0 } });
			if (findUser) {
				findUser = renameKeys({ 'clanMate': 'RSN', 'clanRank': 'Rank', 'totalXP': 'Total XP', 'discord': 'Discord ID', 'discActive': 'Discord Active', 'alt': 'Alt Account' }, findUser);
				for (const item in findUser) {
					result.push({ name: item, value: findUser[item], inline: true });
				}
			}

			if (userInDiscord && findUser) {
				await createEmbedForDB(findUser, { inDisc: userInDiscord, type: 'id' }, result);
			}
			else if (userInDiscord && !findUser) {
				await createEmbedForNoDB(args[0]);
			}
			else if (!userInDiscord && findUser) {
				await createEmbedForDB(findUser, { inDisc: userInDiscord, type: 'id' }, result, 'This person is not in the server but they are in the clan.');
			}
			else {
				await createEmbedForNoDB(args[0], 'The person with this ID is not in the clan, nor in the server. If they are new to the clan, please try again in 60 seconds while I get new data from Jagex.');
				// Could have not been added yet, since on a week rotation. Give option to add (clan name, rank, discordID, discActive, alt)
				await getData('users');
			}

		}
		else if (ranks.includes(args[0].toLowerCase())) {
			// Find by rank
		}
		else {
			// Find by rs name
			// eslint-disable-next-line prefer-const
			let [ rsName, ...rest ] = args;
			if (rest.includes('set')) {
				const setIndex = rest.findIndex(s => s === 'set');
				const lastName = rest.slice(0, setIndex);
				const fullRSN = `${rsName} ${lastName.join(' ')}`;
				rest = rest.slice(setIndex + 1);
				const [ param, ...other ] = rest;

				const booleanConvert = (string) => {
					if (string === 'true') return true;
					else return false;
				};
				const { clanMate } = await usersColl.findOne({ $text: { $search: fullRSN, $caseSensitive: false } }, { projection: { _id: 0, clanMate: 1 } });

				switch (param) {
				case 'discord':
				case 'Discord':
					await usersColl.updateOne({ clanMate }, { $set: { discord: other.join(' ') } });
					return await message.react('✅');
				case 'active':
				case 'discActive':
					if (other.join(' ') === 'true' || other.join(' ') === 'false') {
						await usersColl.updateOne({ clanMate }, { $set: { discActive: booleanConvert(other.join(' ')) } });
						return await message.react('✅');
					}
					else { return message.channel.send('Active state must be set as either `true` or `false`.');}
				case 'alt':
					if (other.join(' ') === 'true' || other.join(' ') === 'false') {
						await usersColl.updateOne({ clanMate }, { $set: { alt: booleanConvert(other.join(' ')) } });
						return await message.react('✅');
					}
					else { return message.channel.send('Alt account must be set as either `true` or `false`.');}
				default: {
					return message.channel.send('Parameters that are able to change are the Discord ID, Discord active status and Alt account status. The parameter names are: `discord`/`Discord` | `active`/`discActive` | `alt`');
				}
				}
			}
			[ ...rsName ] = args;

			let findUser = await usersColl.findOne({ $text: { $search: rsName.join(' '), $caseSensitive: false } }, { projection: { _id: 0, kills: 0 } });
			if (findUser) {
				findUser = renameKeys({ 'clanMate': 'RSN', 'clanRank': 'Rank', 'totalXP': 'Total XP', 'discord': 'Discord ID', 'discActive': 'Discord Active', 'alt': 'Alt Account' }, findUser);
				for (const item in findUser) {
					if (findUser['Discord ID'] === '') findUser['Discord ID'] = 'N/A';
					result.push({ name: item, value: findUser[item], inline: true });
				}
			}
			if (findUser) {
				if (findUser['Discord Active']) {
					await createEmbedForDB(findUser, { inDisc: null, type: 'rsn' }, result);
				}
				else {
					await createEmbedForDB(findUser, { inDisc: null, type: 'rsn' }, result, 'This person is not in the server but they are in the clan.');
				}
			}
			else {
				await createEmbedForNoDB(...rsName, 'Did not find any clan member by that rsn. Make sure you typed it correctly. If they are a new clan member, they may not have been added yet so try again in 60 seconds while I fetch new data from Jagex.');
				await getData('users');
			}
		}

	},
};
