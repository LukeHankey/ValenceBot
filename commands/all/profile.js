const getDb = require("../../mongodb").getDb;
const { MessageEmbed } = require("discord.js");
const colors = require('../../colors.json')
const ms = require('pretty-ms')
const f = require('../../functions.js')

module.exports = {
	name: "profile",
	description: ['Displays the members profile if one is found, otherwise has the option of creating one.', 'Displays the specified members profile if one is found.', 'Displays either the specified members profiile or everyone who has <@role>', 'Shows the top 25 in terms of scout count.'],
	aliases: ['p'],
	usage: ['', '<member ID>', '<@member/@role>', 'all'],
    permissions: [false],
    guildSpecific: ['733164313744769024'],
	run: async (client, message, args, perms) => {
    /*
	* 2 roles to reach. 
	* Command to see who top 10-25 are (all, scouter, verified scouter + staff roles for activity)
	* ;dsf user [all, userID, mention(?)] > All to show top 25, maybe paginate
	* ;dsf role [scouter, verified scouter, staff (all staff)]
	* ;profile (returns self) ✅
	* ;profile [all, userID, mention] || [scouter, verified scouter, staff]
    */
    const db = getDb()
    const settings = db.collection("Settings")
    const memberID = message.member.id
    const data = await settings.findOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': memberID })
    const botRole = message.guild.me.roles.cache.find(r => r.managed)
    const memberRoles = message.member.roles.highest.position


    const sendUserInfo = async (id = memberID, uData = data) => {
        const embed = new MessageEmbed()
            .setTitle(`Member Profile - ${id}`)
            .setDescription(`Current tracked stats in this server.`)
            .setColor(colors.aqua)
            .setThumbnail(message.author.displayAvatarURL())
            .setFooter(`Something wrong or missing? Let a Moderator+ know!`, client.user.displayAvatarURL())
            .setTimestamp()
        const fetchedMember = await message.guild.members.fetch(id)
        const userData = uData.merchChannel.scoutTracker.filter(mem => mem.userID === id)
        const memberAssignedRoles = fetchedMember.roles.cache.filter(r => r.id !== message.guild.id && r.position > botRole.position).map(role => `<@&${role.id}>`)
        const memberSelfRoles = fetchedMember.roles.cache.filter(r => r.id !== message.guild.id && r.position < botRole.position).map(role => `<@&${role.id}>`)
        const fields = [];

        if (!userData.length) return message.channel.send(`\`${fetchedMember.nickname ?? fetchedMember.user.username}\` does not have a profile.`)

        function _text(text) {
            const code = '```';
            return `${code}fix\n${text}${code}`;
        }

        for (const values of userData) {
            fields.push(
                { name: `${values.author}`, value: `Scout count: ${values.count}\nActive for: ${ms(values.lastTimestamp - values.firstTimestamp)}`, inline: true },
                { name: `Assigned Roles:`, value: `${memberAssignedRoles.join(', ') || _text('None')}`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                { name: `Self-Assign Roles:`, value: `${memberSelfRoles.join(', ') || _text('None')}`, inline: true },
                // Think about if there is anything else to view in the user profile stats
                )
        }
        return message.channel.send(embed.addFields(fields))
    }

    const sendRoleInfo = async (id, rData = data) => {
        const roleObj = message.guild.roles.cache.get(id)
        const embed = new MessageEmbed()
            .setTitle(`Member Profiles - ${roleObj.name}`)
            .setDescription(`Current tracked stats in this server.`)
            .setColor(colors.aqua)
            .setThumbnail(message.author.displayAvatarURL())
            .setFooter(`Something wrong or missing? Let a Moderator+ know!`, client.user.displayAvatarURL())
            .setTimestamp()

        const fetchRole = message.guild.roles.cache.get(id) ?? await message.guild.roles.fetch(id)
        const dbData = await rData.merchChannel.scoutTracker
        let memCollection = fetchRole.members.map(mem => mem.id)
        console.log(memCollection)

        if (botRole.position > roleObj.position) return message.channel.send(`You can't view the stats for \`${roleObj.name}\`.`)
        if (roleObj.position > memberRoles) return message.channel.send(`You don't have permission to view the stats for \`${roleObj.name}\`.`)


        let newArr = []
        const fields = [];
        memCollection.forEach(id => {
            let x = dbData.filter(mem => {
                if (mem.userID === id) return mem.userID === id
            })
            newArr.push(x)
        })
       newArr = newArr.flat()

        for (const values of newArr) {
            fields.push({ name: `${values.author}`, value: `Scout count: ${values.count}\nActive for: ${ms(values.lastTimestamp - values.firstTimestamp)}`, inline: true })
        }
        return message.channel.send(embed.addFields(fields))
    }

    if (!args.length) {
        if (data) {
           sendUserInfo()
        } else {
            message.channel.send(`You don't currently have a profile. Would you like to set one up? \`Yes/No\``)
            const filter = m => ['yes', 'no'].includes(m.content.toLowerCase()) && m.member.id === message.member.id
            message.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] })
                .then(async col => {
                    col = col.first()
                    if (col.content === 'no') return
                    else {
                        await settings.findOneAndUpdate({ _id: message.guild.id },
                        {
                            $addToSet: {
                                'merchChannel.scoutTracker': {
                                    userID: col.author.id,
                                    author: col.member.nickname ?? col.author.username,
                                    firstTimestamp: col.createdTimestamp,
                                    firstTimestampReadable: new Date(col.createdTimestamp),
                                    lastTimestamp: col.createdTimestamp,
                                    lastTimestampReadable: new Date(col.createdTimestamp),
                                    count: 0,
                                    assigned: [],
                                }
                            }
                        })
                    return await col.react('✅') && await message.channel.send(`Your profile has been created. Re-use the command to view.`)
                    }
                    
                })
                .catch(col => {
                    message.channel.send(`Timed out. You took too long to respond - No profile has been created.`)
                })
        }
    } else {
        let userID;
        let roleMention;
        let userMention;

        if (f.checkNum(args[0])) {
            userID = message.guild.member(args[0]) ?? await message.guild.members.fetch(args[0])
        } else {
            roleMention = message.guild.roles.cache.has(args[0].slice(3, 21))
            userMention = message.mentions.members.first()
        }

        if (userID) {
            memberRoles > botRole.position // members highest role > bots managed role
                ? sendUserInfo(args[0])
                : message.channel.send(`You don't have permission to use this command.`)
        } else if (roleMention) {
            const roleID = args[0].slice(3, 21)
            memberRoles > botRole.position
                ? sendRoleInfo(roleID)
                : message.channel.send(`You don't have permission to use this command.`)
        } else if (userMention) {
            memberRoles > botRole.position
                ? sendUserInfo(userMention.id)
                : message.channel.send(`You don't have permission to use this command.`)
        } else if (args[0] === 'all') {
            if (perms.mod) {
                const embed = new MessageEmbed()
                    .setTitle(`Member Profiles - Top Scouters`)
                    .setDescription(`Current tracked stats in this server for the top 25 scouters.`)
                    .setColor(colors.aqua)
                    .setThumbnail(message.author.displayAvatarURL())
                    .setFooter(`Something wrong or missing? Let a Moderator+ know!`, client.user.displayAvatarURL())
                    .setTimestamp()

                const data = await settings.findOne({ _id: message.guild.id })
                const items = data.merchChannel.scoutTracker.sort((a, b) => b.count - a.count)
                let fields = [];

                function _text(text) {
                    const code = '```';
                    return `${code}fix\n${text}${code}`;
                }

                for (const values of items) {
                    fields.push({ name: `${values.author}`, value: `Scout count: ${values.count}\nActive for: ${ms(values.lastTimestamp - values.firstTimestamp)}`, inline: true })
                }
                    return message.channel.send(embed.addFields(fields))
                } else return message.channel.send(f.nEmbed("Permission Denied", "You do not have permission to use this command! Only the following can:", colors.red_dark)
                .addField("Roles:", perms.joinM, true)
                .addField("Users:", `<@${message.guild.ownerID}>`, true))
            }
        }
    },
};