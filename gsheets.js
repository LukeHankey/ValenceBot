const {google} = require('googleapis');

// https://console.developers.google.com/
// https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append
// https://www.youtube.com/watch?v=shctaaILCiUgit

const googleClient =  new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, 
    null,
    process.env.GOOGLE_PRIVATE_KEY, 
    ["https://www.googleapis.com/auth/spreadsheets"]
);

// googleSheets: async function googleSheets(gClient) {
    //     const gsapi = google.sheets({ version: "v4", auth: gClient })
    //     const opt = { // READ ONLY OPTIONS
    //         spreadsheetId: "1iyhZrRXPFJnEJEVMKQi58xRp6Uq3XPcOPcWhCG7cZWw",
    //         range: "Contestants!A2:A5",
    //     }
        
    //     let data = await gsapi.spreadsheets.values.get(opt);

    //     let dataArr = data.data.values
    //     let newArr = dataArr.map(row => {
    //         row.push(`${row[0]}-400`)
    //         return row
    //     })
    //     const optW = { // WRITE OPTIONS
    //         spreadsheetId: "1iyhZrRXPFJnEJEVMKQi58xRp6Uq3XPcOPcWhCG7cZWw",
    //         range: "Contestants!S2",
    //         valueInputOption: "USER_ENTERED",
    //         resource: { values: newArr }
    //     }
    //     let update = await gsapi.spreadsheets.values.update(optW)

    //     console.log(update)
    // }

module.exports = {
    googleClient,
}

// /**
//  * Prints the names and majors of students in a sample spreadsheet:
//  * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
//  * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
//  */
// function listMajors(auth) {
//   const sheets = google.sheets({version: 'v4', auth});
//   sheets.spreadsheets.values.get({
//     spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
//     range: 'Class Data!A2:E',
//   }, (err, res) => {
//     if (err) return console.log('The API returned an error: ' + err);
//     const rows = res.data.values;
//     if (rows.length) {
//       console.log('Name, Major:');
//       // Print columns A and E, which correspond to indices 0 and 4.
//       rows.map((row) => {
//         console.log(`${row[0]}, ${row[4]}`);
//       });
//     } else {
//       console.log('No data found.');
//     }
//   });
// }