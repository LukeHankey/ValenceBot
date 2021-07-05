// eslint-disable-next-line no-useless-escape
const merchRegex = /(^(?:m|merch|merchant|w|world){1}\s?(([124569]|1[024568]|2[1-8]|3[0125-79]|4[024-689]|5[0-689]|6[02-9]|7[0-46-9]|8[2-9]|9[12689]|10[03-6]|11[4-79]|12[34]|13[47-9]|140|25[27-9])(([,.\sf]|ua)?|\s[\w\+]*)*)$)/i;
const lobbyWorldsSpace = /(^(?:m|merch|merchant|w|world){1}\s+(25[27-9])(([,.\s]|f|ua)?|\s+\w*)*$)/i;
const lobbyWorldsNoSpace = /(^(?:m|merch|merchant|w|world){1}(25[27-9])(([,.\s]|f|ua)?|\s+\w*)*$)/i;

module.exports = {
	merchRegex,
	lobbyWorldsSpace,
	lobbyWorldsNoSpace,
};