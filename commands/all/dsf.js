const func = require('../../functions')
const colors = require('../../colors.json')
const Discord = require('discord.js')
const getDb = require('../../mongodb').getDb
const { ScouterCheck } = require('../../classes.js')

/**
 * 733164313744769024 - Test Server
 * 668330890790699079 - Valence Bot Test
 * 420803245758480405 - DSF
 */

module.exports = {
    name: "dsf",
    description: ['Displays all of the current stored messages.', 'Clears all of the current stored messages.', 'Shows the list of potential scouters/verified scouters with the set scout count or count adjusted.'],
    aliases: [],
    usage: ['messages|m view', 'messages|m clear', 'view scouter|verified <num (optional)>'],
    guildSpecific: ['733164313744769024', '420803245758480405'],
    run: async (client, message, args, perms) => {
        const db = getDb()
        const settings = db.collection('Settings')

        switch (args[0]) {
            case 'm':
            case 'messages':
                switch (args[1]) {
                    case 'view':
                        if (!perms.admin) {
                            return message.channel.send(perms.errorA)
                        } else {
                            await settings.findOne({ _id: message.guild.id }).then(async res => {
                                const fields = []
                                let data = await res.merchChannel.messages
                                let embed = func.nEmbed('List of messages currently stored in the DB',
                                    'There shouldn\'t be too many as they get automatically deleted after 10 minutes. If the bot errors out, please clear all of them using \`;dsf messages clear\`.',
                                    colors.cream,
                                    message.member.user.displayAvatarURL(),
                                    client.user.displayAvatarURL())

                                for (const values of data) {
                                    let date = new Date(values.time)
                                    date = date.toString().split(' ')
                                    fields.push({ name: `${values.author}`, value: `**Time:** ${date.slice(0, 5).join(' ')}\n**Content:** [${values.content}](https://discordapp.com/channels/${message.guild.id}/${res.merchChannel.channelID}/${values.messageID} 'Click me to go to the message.')`, inline: false })
                                }
                                return message.channel.send(embed.addFields(fields))
                            })
                        }
                        break;
                    case 'clear':
                        if (!perms.admin) {
                            return message.channel.send(perms.errorA)
                        } else {
                            await settings.findOneAndUpdate({ _id: message.guild.id },
                                {
                                    $pull: {
                                        'merchChannel.messages': { time: { $gt: 0 } }
                                    }
                                }
                            )
                            message.react('✅')
                        }
                }
                break;
            case 'view':
                let scout = new ScouterCheck('Scouter')
                let vScout = new ScouterCheck('Verified Scouter')

                const classVars = async (name, serverName, db) => {
                    name._client = client;
                    name._guild_name = serverName;
                    name._db = await db.map(doc => {
                        if (doc.serverName === name._guild_name) return doc
                    }).filter(x => x)[0]
                    return name._client && name._guild_name && name._db
                }
                const res = await settings.find({}).toArray()

                await classVars(vScout, `Luke's Server`, res)
                await classVars(scout, `Luke's Server`, res)

                const num = args[2]

                switch (args[1]) {
                    case 'scouter':
                        if (num) {
                            scout = new ScouterCheck('Scouter', parseInt(num))
                            await classVars(scout, `Luke's Server`, res)
                            scout.send()
                        } else {
                            if (!scout._checkForScouts().length) {
                                message.channel.send('None found.')
                            } else return scout.send()
                        }
                        break;
                    case 'verified':
                        if (num) {
                            vScout = new ScouterCheck('Verified Scouter', parseInt(num))
                            await classVars(vScout, `Luke's Server`, res)
                            vScout.send()
                        } else {
                            if (!vScout._checkForScouts().length) {
                                message.channel.send('None found.')
                            } else return vScout.send()
                        }
                }
                break;
            default:
                if (!perms.admin) return message.channel.send(perms.errorA)
                return message.channel.send(func.nEmbed(
                    "**DSF List**",
                    "Here's a list of all the DSF commands you can use:\n\n\`messages|m view\`\n\`messages|m clear\`",
                    colors.cyan,
                    client.user.displayAvatarURL()
                ))
        }
    }

}
