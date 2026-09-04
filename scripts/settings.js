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
	
	game.settings.register("13omens", "showStoryPrepState", {
		name: "13omens.settings.showStoryPrepState.name",
		hint: "13omens.settings.showStoryPrepState.descrp",
		scope: "world",       
		config: true,        
		requiresReload: false,
		type: String,
		choices : {
			"always" : "13omens.settings.showStoryPrepState.options.always",
			"notReady" :"13omens.settings.showStoryPrepState.options.notReady",
			"never" : "13omens.settings.showStoryPrepState.options.never",
		},
		default: "always"	
	})
}