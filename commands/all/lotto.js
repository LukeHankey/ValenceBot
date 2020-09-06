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
        googleSheets(gsheet.googleClient)
    })
    async function googleSheets(gClient) {
        const gsapi = google.sheets({ version: "v4", auth: gClient })
        const opt = { // READ ONLY OPTIONS
            spreadsheetId: "1iyhZrRXPFJnEJEVMKQi58xRp6Uq3XPcOPcWhCG7cZWw",
            range: "Contestants!A2:A25",
        }

        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        const monthIndex = (new Date()).getUTCMonth()
        let data = await gsapi.spreadsheets.values.get(opt);
        let dataArr = data.data.values
        let userData = [];

        for (names of dataArr) {
            let index = dataArr.indexOf(names) + 1;
            let fields = { name: `${index}. ${names}`, value: '\u200B', inline: true }
            userData.push(fields)
        }

        let gEmbed = func.nEmbed(`Lottery Entrants for the month of ${months[monthIndex]}`, `Those that appear twice in the list have paid for a double entry.`, colors.green_light, message.author.displayAvatarURL())
        message.channel.send(gEmbed.addFields(userData))
        
        
    }
    }
}