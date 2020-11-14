const { MessageEmbed } = require('discord.js');
const colors = require('./colors.json')
const ms = require('pretty-ms')

class Permissions {
    constructor(name, db, msg) {
        this.name = name;
        this.db = db;
        this.msg = msg;
        this._role = this.msg.guild.roles.cache.find(role => role.id === this.roleID());
        this._position = this.msg.guild.roles.cache.filter(roles => roles.rawPosition >= this._role.rawPosition);
    }

    roleID() {
        return this.db.roles[this.name].slice(3, 21)
    }

    memberRole() { // abovePermModArray
        const memberRoleArray = [];
        this._position
            .map(role => role.id)
            .forEach(id => {
                if (this.msg.member.roles.cache.has(id)) return memberRoleArray.push(id)
            })
        return memberRoleArray;
    }

    higherRoles() { // availPermMod
        const higherRoleArray = [];
        this._position
            .map(role => role.id)
            .forEach(id => {
                if (!this.msg.member.roles.cache.has(id)) return higherRoleArray.push(id)
            })
        return higherRoleArray.map(id => `<@&${id}>`);
    }

    modPlusRoles(num = 0) {
        const aboveMod = [];
        this.memberRole().forEach(id => {
            const abovePermRawMod = message.guild.roles.cache.find(role => role.id === id)
            const aboveRpMod = abovePermRawMod.rawPosition + "";
            aboveRpMod.split().forEach(rp => {
                aboveMod.push(rp);
            })
        })
        return aboveMod[num]
    }
}
class ScouterCheck {
    constructor(roleName, value) {
        this.month = 1000 * 60 * 60 * 24 * 31;
        this.week = 1000 * 60; // Update
        this.client;
        this.db;
        this.guild_name;
        this.roleName = roleName;
        this.value = value;
    }

    set _client(c) {
        this.client = c
    }
    set _db(db) {
        this.db = db
    }
    set _guild_name(name) {
        this.guild_name = name
    }

    get _client() {
        return this.client
    }
    get _db() {
        return this.db
    }
    get _guild_name() {
        return this.guild_name
    }
    get guildID() {
        return this._client.guilds.cache.mapValues(x => {
            if (x.name === this._guild_name) return x.id
        })
    }
    get guild() {
        return this._client.guilds.fetch(this.guildID.filter(g => g).first())
    }
    get potentialScouts() {
        let scout;
        if (this.roleName.toLowerCase() === 'scouter') {
            scout = this._db.merchChannel.scoutTracker.filter(val => {
                return this._checkScouts(val, 40, this.week)
            })
        } else if (this.roleName.toLowerCase() === 'verified scouter') {
            scout = this._db.merchChannel.scoutTracker.filter(val => {
                return this._checkVerifiedScouts(val, 100, this.week)
            })
        } else return
        return scout
    }
    get role() {
        return new Promise(async (res, rej) => {
            let guild = await this.guild;
            return res(guild.roles.cache.find(r => r.name.toLowerCase() === this.roleName.toLowerCase())); // Find the guild and then find the role
        })
    }
    get scouts() {
        return this._db.merchChannel.scoutTracker.filter(scouts => {
            return scouts.assigned.length >= 1;
        })
    }

    _checkScouts(filter, num, time) {
        if ((filter.count >= this.count || filter.count >= num) && filter.lastTimestamp - filter.firstTimestamp >= time && filter.assigned.length === 0) return filter
    }
    _checkVerifiedScouts(filter, num, time) {
        if (filter.count >= this.count || filter.count >= num) {
            if (filter.lastTimestamp - filter.firstTimestamp >= time) {
                if (filter.assigned.length > 0 && filter.assigned.length < 2) {
                    return filter
                } else if (filter.assigned.length >= 2) {
                    return
                }
            }
        }
    }

    async _checkForScouts() {
        const scouts = await this.potentialScouts
        const fields = [];

        for (const values of scouts) {
            fields.push({ name: `${values.author}`, value: `ID: ${values.userID}\nCount: ${values.count}\nActive for: ${ms(values.lastTimestamp - values.firstTimestamp)}`, inline: true })
        }
        return fields
    }

    async send() {
        const role = await this.role;
        const db = await this._db;
        const embed = new MessageEmbed()
            .setTitle(`Potential Scouters - ${this.roleName}`)
            .setDescription(`List of members who have met the minimum to obtain the <@&${role.id}> role.`)
            .setColor(colors.orange)
            .setFooter(`Review these members and manually assign the role to them.`, this._client.user.displayAvatarURL())
            .setTimestamp()

        const fields = await this._checkForScouts()

        if (fields.length) { // Perhaps look at adding something if there are > 25
            return this._client.channels.cache.get(db.channels.adminChannel).send(embed.addFields(fields))
        }
        return
    }

    async checkRolesAdded() {
        const guild = await this.guild
        const scouts = await this.potentialScouts
        const role = await this.role

        return new Promise(async (res, rej) => {
            const userID = scouts.map(doc => doc.userID)
            const memberFetch = await guild.members.fetch({ user: userID })
            const membersArray = []
            memberFetch.forEach(mem => {
                if (mem.roles.cache.has(role.id)) {
                    membersArray.push(mem)
                }
                return
            })
            return res(membersArray)
        })
    }

    async checkRolesRemoved() {
        const guild = await this.guild
        const role = await this.role;

        return new Promise(async (res, rej) => {
            const userID = this.scouts.map(doc => doc.userID)
            const memberFetch = await guild.members.fetch({ user: userID })
            const membersArray = []
            memberFetch.forEach(mem => {
                if (!mem.roles.cache.has(role.id)) {
                    membersArray.push(mem)
                }
                return
            })
            return res(membersArray)
        })

    }
}

module.exports = {
    Permissions,
    ScouterCheck
}