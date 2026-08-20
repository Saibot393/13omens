import {o13Actor, o13ActorSheet, actorDMs} from "./scripts/actors.js";
import {o13Item, o13ItemSheet, itemDMs} from "./scripts/items.js";

import  { disPatcher } from "./scripts/disPatcher.js";

import {o13Roll, o13rollConfig} from "./scripts/roll.js";
import {utils} from "./scripts/utils.js";

import {onO13Hooks} from "./scripts/hooks.js";

import {CONSTANTS} from "./scripts/constants.js";

const templatePaths = ["actors/pc", "actors/story", "actors/components/aspects", "items/perk", "dice/dice", "dice/dicebar", "dice/dicebag", "rolls/rollConfig", "rolls/chatRoll", "dialogues/general", "dialogues/confirmOmenDiceRoll"].map((path) => `systems/13omens/templates/${path}.hbs`);

Hooks.once("init", () => {
	//CONST
	CONFIG["13OMENS"] = {...CONSTANTS}
	
	//Actors
	CONFIG.Actor.dataModels = {
		...actorDMs
	};
	
	disPatcher.patch(o13Actor);
	
	CONFIG.Actor.documentClass = o13Actor;
	
	foundry.documents.collections.Actors.registerSheet("thirteen-omens", o13ActorSheet, {
		types: ["pc", "npc", "story"],
		makeDefault: true,
		label: "13OMENS.ActorSheet"
	});
	
	//Items
	CONFIG.Item.dataModels = {
		...itemDMs
	};
	
	disPatcher.patch(o13Item);
	
	CONFIG.Item.documentClass = o13Item;
	
	foundry.documents.collections.Items.registerSheet("thirteen-omens", o13ItemSheet, {
		types: ["archetype", "perk", "gear"],
		makeDefault: true,
		label: "13OMENS.ItemSheet"
	});
	
	//Rolls
	CONFIG.Dice.rolls.push(o13Roll);
	
	//Handlebars
	foundry.applications.handlebars.loadTemplates(templatePaths);
	
	Handlebars.registerHelper("eqLoose", (a, b) => a == b);
	
	//On Hooks
	onO13Hooks();
	
	//API
	game.system.api = {
		o13rollConfig,
		o13Roll,
		utils
	}
});