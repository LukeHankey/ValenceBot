import { google } from 'googleapis'

// https://console.developers.google.com/
// https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append
// https://www.youtube.com/watch?v=shctaaILCiUgit

export const googleClient = new google.auth.JWT(
	process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
	null,
	process.env.GOOGLE_PRIVATE_KEY,
	['https://www.googleapis.com/auth/spreadsheets']
)

export default googleClient
