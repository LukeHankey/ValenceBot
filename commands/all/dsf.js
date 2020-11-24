const func = require('../../functions')
const colors = require('../../colors.json')
const Discord = require('discord.js')
const getDb = require('../../mongodb').getDb

/**
 * 733164313744769024 - Test Server
 * 668330890790699079 - Valence Bot Test
 * 420803245758480405 - DSF
 */

module.exports = {
    name: "dsf",
    description: ['Displays all of the current stored messages.', 'Clears all of the current stored messages.'],
    aliases: [],
    usage: ['messages|m view', 'messages|m clear'],
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
            default:
        }


    }

}
