import {o13Actor, o13ActorSheet, actorDMs} from "./scripts/actors.js";
import {o13Item, o13ItemSheet, itemDMs} from "./scripts/items.js";

import  { disPatcher } from "./scripts/meta/disPatcher.js";

import {o13Roll, o13rollConfig} from "./scripts/roll.js";
import {utils} from "./scripts/utils.js";

import {onO13Hooks} from "./scripts/hooks.js";
import {onO13Sockets} from "./scripts/sockets.js";

import {CONSTANTS, templatePaths} from "./scripts/constants.js";
import {registerEnrichments} from "./scripts/components/enrichments.js";

import {initNews} from "./scripts/meta/news.js";

import {showBanner} from "./scripts/banner.js";

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
	Handlebars.registerHelper("or", (a, b) => a || b); //how is this not a standard thing???
	Handlebars.registerHelper("and", (a, b) => a && b); //nor this???
	Handlebars.registerHelper("not", (a) => !a); //or this???
	Handlebars.registerHelper("array", (...args) => [...args])
	
	//enrichments
	registerEnrichments();
	
	//On Hooks/Sockets
	onO13Hooks();
	onO13Sockets();
	
	//API
	game.system.api = {
		o13rollConfig,
		o13Roll,
		utils,
		showBanner
	}
	
	//News
	initNews();
});