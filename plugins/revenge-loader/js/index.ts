const replacements: [string, string][] = [
	["@revenge-mod/patcher", "@valenced/patcher"],
	["@revenge-mod/modules", "@valenced/modules"],
	["@revenge-mod/types", "@valenced/types"],
	["@revenge-mod/themes-api", "@valenced/themes-api"],
	["@revenge-mod/plugin-cli", "@valenced/plugin-cli"],
	["revenge.api.hidden", "valenced.api.hidden"],
	["revenge.api.themes", "valenced.api.themes"],
	["revenge.api", "valenced.api"],
	["globalThis.revenge", "globalThis.valenced"],
	["revenge.hidden", "valenced.hidden"],
	["revenge.", "valenced."],
]

function convert(source: string): string {
	let result = source

	for (const [oldName, newName] of replacements) {
		result = result.replaceAll(oldName, newName)
	}

	return result
}

export default plugin({
	start() {
		;(globalThis as any).revengeConverter = convert
		console.log("[Revenge Converter] Loaded")
	},

	stop() {
		delete (globalThis as any).revengeConverter
		console.log("[Revenge Converter] Stopped")
	},
})
