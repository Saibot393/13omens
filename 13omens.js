import {o13Actor, o13ActorSheet, actorDMs} from "./scripts/actors.js";
import {o13Item, o13ItemSheet, itemDMs} from "./scripts/items.js";

import {o13Roll} from "./scripts/roll.js";

const templatePaths = ["actors/pc", "actors/story", "actors/components/aspects", "items/perk", "dice/dice", "dice/dicebar", "dice/dicebag", "rolls/rollConfig", "rolls/chatRoll", "dialogues/confirmOmenDiceRoll"].map((path) => `systems/13omens/templates/${path}.hbs`);

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
	
	Hooks.on("createChatMessage", async (message, options, userId) => {
		if (game.user.isGM) {
			//this handles omen dice added to the bag through player rolls with omen flaws
			console.log(message, options, userId);
			if (message.rolls[0] instanceof o13Roll) {
				const roll = message.rolls[0];
				
				const story = game.actors.get(roll._storyID);

				if (story?.isStory) {
					const apply = await foundry.applications.api.DialogV2.confirm({
						window: { title: game.i18n.localize("13omens.titles.confirmOmenDiceAddition") },
						content: await foundry.applications.handlebars.renderTemplate("systems/13omens/templates/dialogues/confirmOmenDiceRoll.hbs", {
							roll : roll,
							story : story
						}),
						rejectClose: false // Returns false instead of rejecting the promise on window close (X or ESC)
					});
					
					if (apply) {
						story.addOmenDice(roll.omenflaws);
					}
				}
			}
		}
	});
});