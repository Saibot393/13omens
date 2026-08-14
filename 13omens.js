import {o13Actor, o13ActorSheet, actorDMs} from "./scripts/actors.js";

const templatePaths = ["actors/pc", "actors/components/aspects", "dice/dice", "dice/dicebar", "rolls/rollConfig"].map((path) => `systems/13omens/templates/${path}.hbs`);

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
	
	foundry.applications.handlebars.loadTemplates(templatePaths);
});