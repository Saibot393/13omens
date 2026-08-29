export function registerSettings() {
	game.settings.register("13omens", "showActBanner", {
		name: "13omens.settings.showActBanner.name",
		hint: "13omens.settings.showActBanner.descrp",
		scope: "world",       
		config: true,        
		requiresReload: false,
		type: Boolean,
		default: true	
	})
}