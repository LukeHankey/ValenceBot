/* eslint-disable no-useless-escape */
export const MERCH_REGEX =
	/(^(?:m|merch|merchant|w|world){1}\s?(([124569]|1[024568]|2[1-8]|3[0125-79]|4[024-689]|5[0-689]|6[02-9]|7[0-46-9]|8[2-9]|9[126-9]|10[03-6]|11[4-79]|12[34]|13[47-9]|140|25[27-9])(([,.\s]|ua|f)?|\s[\W\w\+]*)*)$)/i
export const OTHER_CALLS_REGEX =
	/(^(?:wp|j|jf|wh|sm|tt|a|ark|whirlpool|whale|jelly|jellyfish|pool|sea monster|treasure turtle|turtle|arkaneo|sailfish){1}\s?(([124569]|1[024568]|2[1-8]|3[0125-79]|4[024-689]|5[0-689]|6[02-9]|7[0-46-9]|8[2-9]|9[126-9]|10[03-6]|11[4-79]|12[34]|13[47-9]|140|25[27-9]|21[1-4679]|22[6-9]|238)(([,.\s]|ua|f)?|\s[\W\w\+]*)*)$)/i
export const FOREIGN_WORLD_REGEX =
	/(^(?:m|merch|merchant|w|world|wp|j|jf|wh|sm|tt|a|ark|whirlpool|whale|jelly|jellyfish|pool|sea monster|treasure turtle|turtle|arkaneo|sailfish){1}\s?((47|75|10[12]|118|121|260|278|299)(([,.\s]|ua|f)?|\s[\W\w\+]*)*)$)/i
export const TEN_MINUTES = 600_000
export const ALL_EVENTS_REGEX =
	/^((?<merchant>m|merch|merchant|w|world)|(?<whirlpool>wp|whirlpool|pool)|(?<sea_monster>sm|sea monster)|(?<jellyfish>j|jf|jelly|jellyfish)|(?<whale>wh|whale)|(?<treasure_turtle>tt|turtle|treasure turtle)|(?<arkaneo>a|ark|arkaneo|sailfish))\s?\d{1,3}.*$/i
export const WORLD_FULL_MESSAGE =
	'World 84 has just been called, but unfortunately, it is often full. If you are already on another world, it is advisable that you lobby first, then attempt to join the world, to prevent being disconnected when you try and hop worlds. This way, if the world is full, you will be placed in a queue.'
