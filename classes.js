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
		const embed = func.nEmbed('Permission Denied', 'You do not have permission to use this command!', colors.red_dark)
			.addField('Only the bot owner can:', `<@!${this.owner}>`);
		return { embeds: [ embed ] };
	}

	error() {
		const embed = func.nEmbed('Permission Denied', 'You do not have permission to use this command!', colors.red_dark)
			.addField('Only the following Roles & Users can:', `${this.higherRoles().length > 0 ? this.higherRoles().join(', ') : '0'}`, true)
			.addField('\u200b', `<@${this.msg.guild.ownerId}>`, true);
		return { embeds: [ embed] };
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
			return this._client.channels.cache.get(chan).send({ embeds: [ embed.addFields(fields) ] });
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
				const totalCount = (doc.count + (doc.otherCount ?? 0)) < 10;
				const timeGone = 1000 * 60 * 60 * 24 * 31;
				const timeNoPost = (Date.now() - doc.lastTimestamp) > timeGone;
				return timeNoPost && totalCount;
			});
			return res(merch);
		});
	}
}
class GoogleSheet {
	constructor(gsapi, { spreadsheetId, ranges, valueInputOption = 'USER_ENTERED', resource = {} }) {
		this.gsapi = gsapi;
		this.spreadsheetId = spreadsheetId;
		this.ranges = ranges;
		this.valueInputOption = valueInputOption;
		this.resource = resource;
		this.readRequest = { spreadsheetId, ranges };
		this.fullData = this._getData();
	}

	async _getData() {
		const data = await this.gsapi.spreadsheets.values.batchGet(this.readRequest);
		return data.data;
	}

	async data(range = null) {
		const full = await this.fullData;
		if (!range) {
			return full;
		}
		else {
			const ranges = ['Friends', 'Boosters', 'Affiliates', 'Ranks', 'Banned'];
			if (!ranges.includes(range)) throw new Error(`Invalid range name '${range}'. Must be one of: ${ranges.join(', ')}`);
			const rangeNames = await full.valueRanges.filter(sheet => {
				const name = sheet.range.split('!');
				if (range.toLowerCase() === name[0].toLowerCase()) return sheet;
			});
			if (rangeNames.length) { return rangeNames[0];}
		}
	}


}

module.exports = {
	Permissions,
	ScouterCheck,
	GoogleSheet,
};