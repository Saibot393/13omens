import {syncScreenBordertoSettings} from "./components/screenBorder.js";

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
	
	game.settings.register("13omens", "showRemoteRollConfig", {
		name: "13omens.settings.showRemoteRollConfig.name",
		hint: "13omens.settings.showRemoteRollConfig.descrp",
		scope: "world",       
		config: true,        
		requiresReload: false,
		type: String,
		choices : {
			"always" : "13omens.settings.showRemoteRollConfig.options.always",
			"never" :"13omens.settings.showRemoteRollConfig.options.never"
		},
		default: "always"	
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
	
	game.settings.register("13omens", "screenBorder", {
		name: "13omens.settings.screenBorder.name",
		hint: "13omens.settings.screenBorder.descrp",
		scope: "user",       
		config: true,        
		requiresReload: false,
		type: String,
		choices : {
			"off" : "13omens.settings.screenBorder.options.off",
			"ellipse" :"13omens.settings.screenBorder.options.ellipse",
			"rectangle" : "13omens.settings.screenBorder.options.rectangle",
		},
		default: "ellipse",
		onChange: (value) => {
			syncScreenBordertoSettings();
		}
	})
	syncScreenBordertoSettings();
	
	game.settings.register("13omens", "screenBorder", {
		name: "13omens.settings.screenBorder.name",
		hint: "13omens.settings.screenBorder.descrp",
		scope: "user",       
		config: true,        
		requiresReload: false,
		type: String,
		choices : {
			"off" : "13omens.settings.screenBorder.options.off",
			"ellipse" :"13omens.settings.screenBorder.options.ellipse",
			"rectangle" : "13omens.settings.screenBorder.options.rectangle",
		},
		default: "ellipse",
		onChange: (value) => {
			syncScreenBordertoSettings();
		}
	})
	
	game.settings.register("13omens", "tokenTargetDirectory", {
		name: "13omens.settings.tokenTargetDirectory.name",
		hint: "13omens.settings.tokenTargetDirectory.descrp",
		scope: "world",
		config: true,
		type: String,
		default: "",
		filePicker: "folder"
	})

	game.settings.register("13omens", "autoTokenCreator", {
		name: "13omens.settings.autoTokenCreator.name",
		hint: "13omens.settings.autoTokenCreator.descrp",
		scope: "user",       
		config: true,        
		requiresReload: false,
		type: Boolean,
		default: false
	})	
	
	game.settings.register("13omens", "tokenCreatorButton", {
		name: "13omens.settings.tokenCreatorButton.name",
		hint: "13omens.settings.tokenCreatorButton.descrp",
		scope: "user",       
		config: true,        
		requiresReload: false,
		type: Boolean,
		default: true
	})
	
	Hooks.once("ready", () => {
		if (game.user.isGM) {
			//this setting needs world id information
			if (game.settings.get("13omens", "tokenTargetDirectory") == "") {
				game.settings.set("13omens", "tokenTargetDirectory", `worlds/${game.world.id}/${CONFIG["13OMENS"].DEFAULTTOKENDIRECTORY}`);
			}
		}
	})
}