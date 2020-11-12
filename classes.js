const { MessageEmbed } = require('discord.js');
const client = require('./index')
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
    constructor() {
        this.month = 1000 * 60 * 60 * 24 * 31;
        this.week = 1000 * 60;
        this.client;
        this.db;
    }
    
    set _client(c) {
        this.client = c
    }
    set _db(db) {
        this.db = db
    }

    get _client() {
        return this.client
    }
    get _db() {
        return this.db
    }

    async checkForScouts(roleName, value) { 
        function check(filter, num, time) {
            if (filter.count >= num && filter.lastTimestamp - filter.firstTimestamp >= time && filter.assigned === undefined) return filter
        }

        const guildID = this._client.guilds.cache.mapValues(x => {
            if (x.name === 'Deep Sea Fishing') return x.id
            })
        const guild = await this._client.guilds.fetch(guildID.first())
        let _scouterRole = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase()); // Find the guild and then find the role
        let counterScout

        if (roleName.toLowerCase() === 'scouter') {
            counterScout = await this._db.merchChannel.scoutTracker.filter(val => check(val, value || 10, this.week))
        } else if (roleName.toLowerCase() === 'verified scouter') {
            counterScout = await this._db.merchChannel.scoutTracker.filter(val => check(val, value || 25, this.week))
        } else return

        const embed = new MessageEmbed()
            .setTitle(`Potential Scouters`)
            .setDescription(`List of members who have met the minimum to obtain the <@&${_scouterRole.id}> role.`)
            .setColor(colors.orange)
        const fields = [];
        const scouts = await counterScout

        console.log(roleName, _scouterRole, counterScout)

        for (const values of scouts) {
            fields.push({ name: `${values.author}`, value: `ID: ${values.userID}\nCount: ${values.count}\nActive for: ${ms(values.lastTimestamp - values.firstTimestamp)}`, inline: true })
        }
        if (scouts.length) {
            return this._client.channels.cache.get(this._db.channels.adminChannel).send(embed.addFields(fields))
        }
        return
    }
}

module.exports = {
    Permissions,
    ScouterCheck
}