const func = require('../../functions')
const colors = require('../../colors.json')
const getDb = require('../../mongodb').getDb
const { ScouterCheck } = require('../../classes.js')

/**
 * 733164313744769024 - Test Server
 * 668330890790699079 - Valence Bot Test
 * 420803245758480405 - DSF
 */

module.exports = {
    name: "dsf",
    description: ['Displays all of the current stored messages.', 'Clears all of the current stored messages.', 'Shows the list of potential scouters/verified scouters with the set scout count, or count adjusted.', 'Add 1 or <num> merch count to the member provided.', 'Remove 1 or <num> merch count to the member provided.'],
    aliases: [],
    usage: ['messages view', 'messages clear', 'view scouter/verified <num (optional)>', 'user memberID/@member add <num (optional)> <other>', 'user memberID/@member remove <num (optional)> <other>'],
    guildSpecific: ['733164313744769024', '420803245758480405'],
    run: async (client, message, args, perms) => {
        if (!perms.mod) return message.channel.send(perms.errorM)
        const db = getDb()
        const settings = db.collection('Settings')

        switch (args[0]) {
            case 'm':
            case 'messages':
                switch (args[1]) {
                    case 'view':
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
                        break;
                    case 'clear':
                        await settings.findOneAndUpdate({ _id: message.guild.id },
                            {
                                $pull: {
                                    'merchChannel.messages': { time: { $gt: 0 } }
                                }
                            }
                        )
                        message.react('✅')
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
                await classVars(vScout, message.guild.name, res)
                await classVars(scout, message.guild.name, res)
                const num = args[2]

                switch (args[1]) {
                    case 'scouter':
                        if (num) {
                            scout = new ScouterCheck('Scouter', parseInt(num))
                            await classVars(scout, message.guild.name, res)
                            scout.send(message.channel.id)
                        } else {
                            const scoutCheck = await scout._checkForScouts()
                            if (!scoutCheck.length) {
                                message.channel.send('None found.')
                            } else return scout.send(message.channel.id)
                        }
                        break;
                    case 'verified':
                        if (num) {
                            vScout = new ScouterCheck('Verified Scouter', parseInt(num))
                            await classVars(vScout, message.guild.name, res)
                            vScout.send(message.channel.id)
                        } else {
                            const verifiedCheck = await vScout._checkForScouts()
                            if (!verifiedCheck.length) {
                                message.channel.send('None found.')
                            } else return vScout.send(message.channel.id)
                        }
                }
                break;
            case 'user': {
                let [userID, param, num] = args.slice(1)
                cacheCheck = async (user) => {
                    if (!message.guild.members.cache.has(user)) {
                        return await message.guild.members.fetch(user)
                            .then(user => true)
                            .catch(e => false)
                    } else {
                        return true
                    }
                }
                let checkMem = cacheCheck(userID)
                const reaction = await checkMem
                func.checkNum(userID) && checkMem ? userID = userID : userID = undefined
                const userMention = message.mentions.members.first()?.user.id ?? userID

                console.log(userMention)

                if (userMention === undefined) return message.channel.send(`Please provide a valid member ID or member mention.`)
                switch (param) {
                    case 'add':
                        if (!num) {
                            await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
                                $inc: {
                                    'merchChannel.scoutTracker.$.count': 1,
                                },
                            })
                            if (reaction) return message.react('✅')
                            else return message.react('❌')
                        } else if (num === 'other') {
                            await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
                                $inc: {
                                    'merchChannel.scoutTracker.$.otherCount': 1,
                                },
                            })
                            if (reaction) return message.react('✅')
                            else return message.react('❌')
                        } else {
                            if (isNaN(parseInt(num))) {
                                return message.channel.send(`\`${num}\` is not a number.`)
                            } else num = +num
                            const other = args.slice(4)
                            if (other[0] === 'other') {
                                await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
                                    $inc: {
                                        'merchChannel.scoutTracker.$.otherCount': +num,
                                    },
                                })
                                if (reaction) return message.react('✅')
                                else return message.react('❌')
                            } else {
                                await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
                                    $inc: {
                                        'merchChannel.scoutTracker.$.count': +num,
                                    },
                                })
                                if (reaction) return message.react('✅')
                                else return message.react('❌')
                            }
                        }
                    case 'remove':
                        if (!num) {
                            await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
                                $inc: {
                                    'merchChannel.scoutTracker.$.count': -1,
                                },
                            })
                            if (reaction) return message.react('✅')
                            else return message.react('❌')
                        } else if (num === 'other') {
                            await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
                                $inc: {
                                    'merchChannel.scoutTracker.$.otherCount': -1,
                                },
                            })
                            if (reaction) return message.react('✅')
                            else return message.react('❌')
                        } else {
                            if (isNaN(parseInt(num))) {
                                return message.channel.send(`\`${num}\` is not a number.`)
                            } else num = +num
                            const other = args.slice(4)
                            if (other[0] === 'other') {
                                await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
                                    $inc: {
                                        'merchChannel.scoutTracker.$.otherCount': -num,
                                    },
                                })
                                if (reaction) return message.react('✅')
                                else return message.react('❌')
                            } else {
                                await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
                                    $inc: {
                                        'merchChannel.scoutTracker.$.count': -num,
                                    },
                                })
                                if (reaction) return message.react('✅')
                                else return message.react('❌')
                            }
                        }
                    default:
                        return message.channel.send(`Valid params are \`add\` or \`remove\`.`)
                }
            }
            default:
                return message.channel.send(func.nEmbed(
                    "**DSF Admin Commands List**",
                    "Here's a list of all the DSF commands you can use. Any parameter(s) in \`<>\` are optional:\n\n\`messages|m view\`\n\`messages|m clear\`\n\`view scouter <num>\`\n\`view verified <num>\`\n\`user memberID/@member add <other> <num>\`\n\`user memberID/@member remove <other> <num>\`",
                    colors.cyan,
                    client.user.displayAvatarURL()
                ))
        }
    }
}
