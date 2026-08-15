/**
 * Bundled world defaults.
 *
 * These are the lists the three repositories carried in code before the world
 * registry existed. They are the fallback when Mongo holds no registry
 * document, and the seed for the first write.
 *
 * Base worlds are the permanent members list from DSF-Server. Specials are the
 * icon groups this bot already reacted with; keys are snake_case so the same
 * key can name a Discord emoji here and a PNG in the Alt1 client.
 */

export const DEFAULT_BASE_WORLDS = [
	1, 2, 4, 5, 6, 9, 10, 12, 14, 15, 16, 18, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 32, 35, 36, 37, 39, 40, 42, 44, 45, 46, 48,
	49, 50, 51, 52, 53, 54, 56, 58, 59, 60, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 76, 77, 78, 79, 82, 83, 84, 85,
	86, 87, 88, 89, 91, 92, 96, 97, 98, 99, 100, 103, 104, 105, 106, 114, 115, 116, 117, 119, 123, 124, 134, 137, 138, 139, 140,
	252, 257, 258, 259
]

/**
 * Leagues ship DISABLED: this list is from the September 2025 season and the
 * worlds change every season. Set the real list with
 * `/worlds add leagues <numbers>` and then `/worlds enable leagues`.
 */
export const DEFAULT_LEAGUE_WORLDS = [
	13, 142, 211, 212, 213, 214, 215, 216, 217, 218, 219, 226, 227, 228, 229, 237, 238, 261, 262, 263, 264, 265, 266, 267, 268,
	269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293,
	294, 295, 296, 297, 298
]

export const DEFAULT_SPECIALS = [
	{ key: 'legacy', label: 'Legacy', enabled: true, worlds: [18, 115, 137] },
	{ key: 'twenty_plus', label: '2000+ total', enabled: true, worlds: [30] },
	{ key: 'twenty_six_plus', label: '2600+ total', enabled: true, worlds: [48] },
	{ key: 'vip', label: 'VIP', enabled: true, worlds: [52] },
	{ key: 'eoc', label: 'EoC', enabled: true, worlds: [66] },
	{ key: 'sixty_nine', label: 'Nice', enabled: true, worlds: [69] },
	{ key: 'laggy', label: 'Laggy', enabled: true, worlds: [84] },
	{ key: 'fifteen_plus', label: '1500+ total', enabled: true, worlds: [86, 114] },
	{ key: 'quick_chat', label: 'Quick chat', enabled: true, worlds: [96] },
	{ key: 'dsf', label: 'DSF world', enabled: true, worlds: [116] },
	{ key: 'leagues', label: 'Leagues', enabled: false, worlds: DEFAULT_LEAGUE_WORLDS }
]
