import {o13Actor, o13ActorSheet, actorDMs} from "./scripts/actors.js";
import {o13Item, o13ItemSheet, itemDMs} from "./scripts/items.js";

import  { disPatcher } from "./scripts/disPatcher.js";

import {o13Roll} from "./scripts/roll.js";
import {onO13Hooks} from "./scripts/hooks.js";

const templatePaths = ["actors/pc", "actors/story", "actors/components/aspects", "items/perk", "dice/dice", "dice/dicebar", "dice/dicebag", "rolls/rollConfig", "rolls/chatRoll", "dialogues/general", "dialogues/confirmOmenDiceRoll"].map((path) => `systems/13omens/templates/${path}.hbs`);

Hooks.once("init", () => {
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
	
	CONFIG.Item.dataModels = {
		...itemDMs
	};
	
	CONFIG.Item.documentClass = o13Item;
	
	foundry.documents.collections.Items.registerSheet("thirteen-omens", o13ItemSheet, {
		types: ["archetype", "perk", "gear"],
		makeDefault: true,
		label: "13OMENS.ItemSheet"
	});
	
	CONFIG.Dice.rolls.push(o13Roll);
	
	foundry.applications.handlebars.loadTemplates(templatePaths);
	
	Handlebars.registerHelper("eqLoose", (a, b) => a == b);
	
	onO13Hooks();
});