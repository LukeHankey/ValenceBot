const { MessageEmbed } = require('discord.js')
const colors = require('../../colors.json')

module.exports = {
    name: 'reply',
    description: ["Replies to the specified DM."],
    aliases: [],
    usage: ['<user ID> <message>'],
    guildSpecific: '668330890790699079',
    run: async (client, message, args, perms) => {
        if (!perms.owner) return message.channel.send(perms.errorO)
        const [userID, ...content] = args

        if (!content.length) return message.channel.send('Error: Cannot send an empty message.')

        client.users.fetch(userID)
        .then(user => {
            user.send(content.join(' '))
            message.react('✅')
        })
        .catch(e => {
            if (e.code === 10013) {
               return message.channel.send(`Error: ${e.message}`)
            } else console.log(e)
        })
        

    },
};