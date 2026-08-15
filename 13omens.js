import {o13Actor, o13ActorSheet, actorDMs} from "./scripts/actors.js";

import {o13Roll} from "./scripts/roll.js";

const templatePaths = ["actors/pc", "actors/components/aspects", "dice/dice", "dice/dicebar", "rolls/rollConfig", "rolls/chatRoll"].map((path) => `systems/13omens/templates/${path}.hbs`);

Hooks.once("init", () => {
	CONFIG.Actor.dataModels = {
		...actorDMs
	};
	
	CONFIG.Actor.documentClass = o13Actor;
	
	foundry.documents.collections.Actors.registerSheet("thirteen-omens", o13ActorSheet, {
		types: ["pc", "npc", "story"],
		makeDefault: true,
		label: "13OMENS.ActorSheet"
	});
	
	CONFIG.Dice.rolls.push(o13Roll);
	
	foundry.applications.handlebars.loadTemplates(templatePaths);
});