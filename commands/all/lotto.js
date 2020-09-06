const gsheet = require('../../gsheets');
const { google } = require('googleapis');
const func = require('../../functions')
const colors = require('../../colors.json')

module.exports = {
name: "lotto",
description: ["", ""],
aliases: ["lottery"],
usage: ["", ""],
run: async (client, message, args) => {
    gsheet.googleClient.authorize(err => {
        if (err) console.error(err)
        googleSheets(gsheet.googleClient)
    })

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const monthIndex = (new Date()).getUTCMonth()
    let userData = []; // Holds all fields in specified range
    let page = 1;

        async function googleSheets(gClient) {
            const gsapi = google.sheets({ version: "v4", auth: gClient })
            const opt = { // READ ONLY OPTIONS
                spreadsheetId: "1iyhZrRXPFJnEJEVMKQi58xRp6Uq3XPcOPcWhCG7cZWw",
                range: "test!B2:C51",
            }

            let data = await gsapi.spreadsheets.values.get(opt);
            let dataArr = data.data.values
            let found = [];

            for (values of dataArr) {
                let index = dataArr.indexOf(values) + 1;
                let fields = { name: `${index}. ${values[0]}`, value: `${values[1]}`, inline: true }
                userData.push(fields)
            }

            let gEmbed = func.nEmbed(
                `Lottery Entrants for the month of ${months[monthIndex]}`,
                `Those that appear twice in the list have paid for a double entry.`,
                colors.green_light,
                message.author.displayAvatarURL()
                )
                .setFooter(`Page ${page} of ${Math.floor(userData.length/24) + 1}`)

           
            if (args[0]) {
            let nameFound = dataArr.filter(name => name[0].toLowerCase() === args[0].toLowerCase())
            for (values of nameFound) {
                let fields = { name: `${values[0]}`, value: `${values[1]}`, inline: true}
                found.push(fields)
            }
            
            if (nameFound && nameFound.length === 1) {
                    message.channel.send(func.nEmbed(
                    `Lottery Entrance`,
                    `You are in the lottery only once for this month!`,
                    colors.green_dark,
                    message.author.displayAvatarURL()
                    )
                    .addFields(found)
                    .addField("Want to enter twice for double the chance of winning?", `It only costs 30 Clan Points! Let the Admins know in <#640641467798519808>!`)
                    )}
                else if (nameFound && nameFound.length === 2) {
                    message.channel.send(func.nEmbed(
                        `Lottery Entrance`,
                        `You are in the lottery ${nameFound.length} times for this month!`,
                        colors.green_dark,
                        message.author.displayAvatarURL()
                        )
                        .addFields(found))
                        // .addField(`\u200B`, `\u200B`)
                }
                else {
                    message.channel.send(func.nEmbed(
                        `Lottery Entrance`,
                        `You are **Not** in the lottery for this month!`,
                        colors.red_dark,
                        message.author.displayAvatarURL()
                        )
                        .addField("Get your lotto entry in!", `Message any Admin in game to pay the 500k entry fee!`))           
                }
            }
            else if (!args[0]) {
                if (userData.length <= 24) {
                    message.channel.send(gEmbed
                        .addFields(userData)
                        .setFooter(`Page ${page} of ${Math.floor(userData.length/24) + 1}`)
                        )
                }
                else if (userData.length >= 25 && userData.length <= 48) {
                    message.channel.send(gEmbed
                        .addFields(userData.slice(0, 24)))
                    .then(async msg => {
                        await msg.react('◀️')
                        await msg.react('▶️')

                        const bReact = (reaction, user) => reaction.emoji.name === '◀️' && user.id === message.author.id
                        const fReact = (reaction, user) => reaction.emoji.name === '▶️' && user.id === message.author.id

                        const bCollect = msg.createReactionCollector(bReact, { time: 30000})
                        const fCollect = msg.createReactionCollector(fReact, { time: 30000})

                        let userDataOne = userData.slice(24)

                        fCollect.on('collect', (r, u) => {
                            msg.reactions.resolve('▶️').users.remove(u.id)
                            if (page == Math.floor(userData.length/24) +1) return
                            page++;
                            gEmbed.spliceFields(0, 24)
                            gEmbed.spliceFields(0, 24, userDataOne)
                            gEmbed.setFooter(`Page ${page} of ${Math.floor(userData.length/24) + 1}`)
                            msg.edit(gEmbed)
                        })

                        bCollect.on('collect', (r, u) => {
                            msg.reactions.resolve('◀️').users.remove(u.id)
                            if (page == 1) return
                            page--;
                            gEmbed.spliceFields(0, 24, userData.slice(0, 24))
                            gEmbed.setFooter(`Page ${page} of ${Math.floor(userData.length/24) + 1}`)
                            msg.edit(gEmbed)
                        })
                    })
                }
            }
    }
    }
}