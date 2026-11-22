const g = globalThis as any

export default plugin({
	start() {
		if (!g.valenced) {
			console.error("[RevengeLoader] Valenced API unavailable")
			return
		}

		g.revenge ??= g.valenced

		console.log("[RevengeLoader] Compatibility alias initialized")
		console.log("[RevengeLoader] revenge → valenced")
	},

	stop() {
		if (g.revenge === g.valenced) {
			delete g.revenge
		}

		console.log("[RevengeLoader] Stopped")
	},
})
