/* eslint-disable no-async-promise-executor */
/* eslint-disable no-inline-comments */
const { MessageEmbed } = require('discord.js');
const colors = require('./colors.json');
const func = require('./functions');
const ms = require('pretty-ms');

class Permissions {
	constructor(name, db, msg) {
		this.name = name;
		this.db = db;
		this.msg = msg;
		this._role = this.msg.guild.roles.cache.find(role => role.id === this.roleID);
		this._position = this.msg.guild.roles.cache.filter(roles => {
			if (this._role === undefined) return;
			else return roles.rawPosition >= this._role.rawPosition;
		});
	}

	get roleID() {
		// eslint-disable-next-line getter-return
		if (this.db.roles[this.name] === undefined) return;
		else return this.db.roles[this.name].slice(3, 21);
	}

	memberRole() { // abovePermModArray
		const memberRoleArray = [];
		this._position
			.map(role => role.id)
			.forEach(id => {
				if (this.msg.member.roles.cache.has(id)) return memberRoleArray.push(id);
			});
		return memberRoleArray;
	}

	higherRoles() { // availPermMod
		const higherRoleArray = [];
		this._position
			.map(role => role.id)
			.forEach(id => {
				if (!this.msg.member.roles.cache.has(id)) return higherRoleArray.push(id);
			});
		return higherRoleArray.map(id => `<@&${id}>`);
	}

	modPlusRoles(num = 0) {
		const aboveMod = [];
		this.memberRole().forEach(id => {
			const abovePermRawMod = this.msg.guild.roles.cache.find(role => role.id === id);
			const aboveRpMod = abovePermRawMod.rawPosition + '';
			aboveRpMod.split().forEach(rp => {
				aboveMod.push(rp);
			});
		});
		return aboveMod[num];
	}

	get owner() {
		const id = '212668377586597888';
		return id;
	}

	botOwner() {
		return this.msg.member.id === this.owner ? true : false;
	}

	ownerError() {
		return func.nEmbed('Permission Denied', 'You do not have permission to use this command!', colors.red_dark)
			.addField('Only the bot owner can:', `<@!${this.owner}>`);
	}

	error() {
		return func.nEmbed('Permission Denied', 'You do not have permission to use this command!', colors.red_dark)
			.addField('Only the following Roles & Users can:', `${this.higherRoles().length > 0 ? this.higherRoles().join(', ') : '0'}`, true)
			.addField('\u200b', `<@${this.msg.guild.ownerID}>`, true);
	}

}
class ScouterCheck {
	constructor(roleName, value) {
		this.month = 1000 * 60 * 60 * 24 * 31;
		this.week = 1000 * 60 * 60 * 24 * 7;
		this.client;
		this.db;
		this.guild_name;
		this.roleName = roleName;
		this.value = value;
	}
	set _client(c) {
		this.client = c;
	}
	set _db(db) {
		this.db = db;
	}
	set _guild_name(name) {
		this.guild_name = name;
	}

	get _client() {
		return this.client;
	}
	get _db() {
		return this.db;
	}
	get _guild_name() {
		return this.guild_name;
	}
	get guildID() {
		return this._client.guilds.cache.mapValues(x => {
			if (x.name === this._guild_name) return x.id;
		});
	}
	get guild() {
		return this._client.guilds.fetch(this.guildID.filter(g => g).first());
	}
	get potentialScouts() {
		let scout;
		if (this.roleName.toLowerCase() === 'scouter') {
			scout = this._db.merchChannel.scoutTracker.filter(val => {
				return this._checkScouts(val, this.value ?? 40, this.week);
			});
		}
		else if (this.roleName.toLowerCase() === 'verified scouter') {
			scout = this._db.merchChannel.scoutTracker.filter(val => {
				return this._checkVerifiedScouts(val, this.value ?? 100, this.month);
			});
		}
		// eslint-disable-next-line getter-return
		else {return;}
		return scout;
	}
	get role() {
		return new Promise(async (res) => {
			const guild = await this.guild;
			return res(guild.roles.cache.find(r => r.name.toLowerCase() === this.roleName.toLowerCase())); // Find the guild and then find the role
		});
	}
	get scouts() {
		return this._db.merchChannel.scoutTracker.filter(scouts => {
			return scouts.assigned.length >= 1;
		});
	}

	_checkScouts(filter, num, time) { // Just takes merch count, not other count
		if ((filter.count >= this.count || filter.count >= num) && filter.lastTimestamp - filter.firstTimestamp >= time && filter.assigned.length === 0) return filter;
	}
	_checkVerifiedScouts(filter, num, time) { // Just takes merch count, not other count
		if (filter.count >= this.count || filter.count >= num) {
			if (filter.lastTimestamp - filter.firstTimestamp >= time) {
				if (filter.assigned.length > 0 && filter.assigned.length < 2) {
					return filter;
				}
				else if (filter.assigned.length >= 2) {
					return;
				}
			}
		}
	}

	async _checkForScouts() {
		const scouts = await this.potentialScouts;
		const fields = [];

		for (const values of scouts) {
			fields.push({ name: `${values.author}`, value: `ID: ${values.userID}\nMerch Count: ${values.count}\nOther Count: ${values.otherCount}\nActive for: ${ms(values.lastTimestamp - values.firstTimestamp)}`, inline: true });
		}
		return fields;
	}

	async send(chan = this._db.channels.adminChannel) {
		const role = await this.role;
		const embed = new MessageEmbed()
			.setTitle(`Potential Scouters - ${this.roleName}`)
			.setDescription(`List of members who have met the minimum to obtain the <@&${role.id}> role.`)
			.setColor(colors.orange)
			.setFooter('Review these members and manually assign the role to them.', this._client.user.displayAvatarURL())
			.setTimestamp();

		const fields = await this._checkForScouts();

		if (fields.length) { // Perhaps look at adding something if there are > 25
			return this._client.channels.cache.get(chan).send(embed.addFields(fields));
		}
		return;
	}

	async checkRolesAdded() {
		const guild = await this.guild;
		const scouts = await this.potentialScouts;
		const role = await this.role;

		return new Promise(async (res) => {
			const userID = scouts.map(doc => doc.userID);
			const memberFetch = await guild.members.fetch({ user: userID });
			const membersArray = [];
			memberFetch.forEach(mem => {
				if (mem.roles.cache.has(role.id)) {
					membersArray.push(mem);
				}
				return;
			});
			return res(membersArray);
		});
	}

	async checkRolesRemoved() {
		const guild = await this.guild;
		const role = await this.role;

		return new Promise(async (res) => {
			const userID = this.scouts.map(doc => doc.userID);
			const memberFetch = await guild.members.fetch({ user: userID });
			const membersArray = [];
			memberFetch.forEach(mem => {
				if (!mem.roles.cache.has(role.id)) {
					membersArray.push(mem);
				}
				return;
			});
			return res(membersArray);
		});
	}

	async removeInactive() {
		const db = await this._db;

		return new Promise(async (res) => {
			let merch = await db.merchChannel.scoutTracker;
			merch = merch.filter(doc => {
				const totalCount = (doc.count + (doc.otherCount ?? 0)) < 5;
				const timeGone = 1000 * 60 * 60 * 24 * 31;
				const timeNoPost = (Date.now() - doc.lastTimestamp) > timeGone;
				return timeNoPost && totalCount;
			});
			return res(merch);
		});
	}
}

class Paginate {
	constructor(reaction, database) {
		this.reaction = reaction;
		this.message = this.reaction.message;
		this.database = database;
		this.embeds = [];
		this.page = 0;
	}

	embedData() {
		return this.database.merchChannel.spamProtection.map(obj => {
			// obj = messageID, content, time, author, userID, users[]
			const messageLink = `https://discord.com/channels/${this.message.guild.id}/${this.database.merchChannel.channelID}/${obj.messageID}`;
			const usersList = obj.users.map(userObj => {
				// userObj = User, total count, skull count, reactions[]
				let skullsCount = 0;
				userObj.reactions.filter(r => {
					if (['☠️', '💀', '<:skull:805917068670402581>'].includes(r.emoji)) {
						skullsCount = skullsCount + r.count;
					}
				});
				return { totalCount: userObj.count, skullCount: skullsCount, user: { id: userObj.id, username: userObj.username }, reactions: userObj.reactions };
			});

			const fieldGenerator = () => {
				const first = { name: '\u200B', value: `Grouped below are for [this message from ${obj.author} | ${obj.content}.](${messageLink})` };
				const dataFields = [];
				usersList.forEach(u => {
					// Filters added here
					if (u.totalCount > 9 || u.reactions.length > 4) {
						const emojis = u.reactions.map(e => { return `${e.emoji} **- ${e.count}**`; });
						dataFields.push({ name: `${u.user.username} - ${u.user.id}`, value: `Mention: <@!${u.user.id}>\nTotal Reacts (${u.skullCount}/${u.totalCount})\n\n${emojis.join('  |   ')}`, inline: true });
					}
					else { return; }
				});
				if (dataFields.length) {
					dataFields.unshift(first);
					if (dataFields.length > 8) {
						// Pagination
						dataFields.splice(9, 0, first);
					}
				}
				return dataFields;
			};
			const fields = [];
			fields.push(...fieldGenerator());
			return fields;
		});
	}

	paginate() {
		const pageEmbeds = [];
		if (!this.embedData()) return;
		const data = this.embedData().flat();
		let k = 8;
		for (let i = 0; i < data.length; i += 8) {
			const current = data.slice(i, k);
			k += 8;
			const info = current;
			const embed = new MessageEmbed()
				.setTitle('Reaction Spammers Incoming!')
				.setDescription(`Threholds are 10 reactions clicked (can be the same one) or 5 different reactions clicked.\n📥 - Update the post with new information.\n⏰ - Starts a continuous timer that checks members on this post to see if they have the Grounded role. If they do, it will remove them.\n⏹️ - Stops the timer.`)
				.setThumbnail(this.message.guild.discoverySplashURL() || this.message.guild.iconURL())
				.setColor(colors.orange)
				.setTimestamp()
				.addFields(info);
			pageEmbeds.push(embed);
		}
		return pageEmbeds;
	}

	getData() {
		return this.embedData();
	}

	set spamPost(post) {
		this._spamPost = post;
	}

	edit(embed) {
		return this._spamPost.edit(embed);
	}

	spamMessages() {
		// Gets the message that has been reacted to
		return this.database.merchChannel.spamProtection.map(obj => {
			if (obj.messageID === this.message.id) return obj;
		}).filter(m => m);
	}

	/**
	 * @property {Array} users - Users above a threshold
	 * @returns {Array} Includes undefined and objects of members who meet the thresholds.
	 */

	get membersAboveThreshold() {
		const membersAbove = this.users.flat().map(u => {
			if (u.totalCount > 9 || u.reactions.length > 4) {
				return { member: u.user, msg: u.msg };
			}
		});
		return membersAbove;
	}

	get membersBelowThreshold() {
		return this.database.merchChannel.spamProtection.map(obj => {
			if (!obj.users.length) {
				return { member: { id: null, usernmae: null }, msg: obj.messageID };
			}
			return obj.users.map(u => {
				if (u.count <= 9 && u.reactions.length <= 4) {
					return { member: { id: u.id, usernmae: u.username }, msg: obj.messageID };
				}
			}).filter(o => o);
		}).filter(o => o).flat();
	}

	get users() {
		return this.spamMessages().map(m => {
			return m.users.map(userObj => {
				return { totalCount: userObj.count, user: { id: userObj.id, username: userObj.username }, msg: m.messageID, reactions: userObj.reactions };
			});
		});
	}

	get thresholdMembers() {
		const members = this.membersAboveThreshold.map(o => {
			if (o === undefined) return;
			o = o.member.id;
			return o;
		}).filter(id => id);
		return members;
	}

	get thresholdMessages() {
		const messages = this.membersAboveThreshold.map(o => {
			if (o === undefined) return;
			o = o.msg;
			return o;
		}).filter(msg => msg);
		return messages;
	}

	get fetchedMembers() {
		return this.message.guild.members.fetch({ user: this.thresholdMembers });
	}

	async checkGroundedRoles() {
		// Collection of members - Checking the first one
		const members = await this.fetchedMembers;
		const groundedRole = this.message.guild.roles.cache.find(r => r.name === 'Grounded');
		if (!members.size) return;
		return members.map(mem => {
			return { result: mem._roles.includes(groundedRole.id), messageID: this.thresholdMessages[0], id: mem.user.id };
		});
	}
}

module.exports = {
	Permissions,
	ScouterCheck,
	Paginate,
};