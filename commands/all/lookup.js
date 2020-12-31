const func = require('../../functions')
const colors = require('../../colors.json')
const ms = require('pretty-ms')
const getDb = require("../../mongodb").getDb;

/**
 * 668330890790699079 - Valence Bot Server
 * 733164313744769024 - Test Server
 */

module.exports = {
    name: "lookup",
    description: [""],
    aliases: ["lu"],
    usage: [""],
    guildSpecific: ['420803245758480405', '733164313744769024', '668330890790699079'],
    run: async (client, message, args, perms, channels) => {
        if (!perms.owner) return message.channel.send(perms.errorO) 
        if (!args[0]) return message.channel.send('Please provide a User ID')
        const db = getDb()
        const settingsColl = db.collection("Settings")

        const val = await settingsColl.findOne({ _id: '420803245758480405' })
        const fields = []
        const dataIndex = val.merchChannel.scoutTracker.findIndex(mem => {
            return mem.userID === args[0]
        })
        const allData = val.merchChannel.scoutTracker.length
        const member = val.merchChannel.scoutTracker.filter(mem => mem.userID === args[0])
        val.merchChannel.scoutTracker.filter(mem => {
            if (mem.userID === args[0]) {
                const date = (when) => {
                    let date = new Date(when)
                    date = date.toString().split(' ')
                    return date.slice(0, 5).join(' ')
                }
                fields.push({ name: `\u200b`, 
                value: `**firstTimestamp:** ${mem.firstTimestamp}\n**firstTimestampReadable:** ${date(mem.firstTimestampReadable)}\n**lastTimestamp:** ${mem.lastTimestamp}\n**lastTimestampReadable:** ${date(mem.lastTimestampReadable)}\n**Merch count:** ${mem.count}\n**Other count:** ${mem.otherCount}\n**Active for:** ${ms(mem.lastTimestamp - mem.firstTimestamp)}`,
                inline: true },)
            }
        })

        if (member[0]) {
            const embed = func.nEmbed(`Diagnostic DB Lookup - ${member[0].author} [${dataIndex}/${allData}]`, `Testing command to lookup user info for DSF in DB.`, colors.gold)
            return message.channel.send(embed.addFields(fields))
        } else {
            message.channel.send(`No profile found for this ID.`)
        }
    }
}
