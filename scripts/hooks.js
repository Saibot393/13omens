import {o13Roll} from "./roll.js";

export function onO13Hooks() {
	Hooks.on("createChatMessage", async (message, options, userId) => {
		if (game.user.isGM) {
			//this handles omen dice added to the bag through player rolls with omen flaws
			if (message.rolls[0] instanceof o13Roll) {
				const roll = message.rolls[0];
				
				const story = game.actors.get(roll._storyID);

				if (story?.isStory && roll.omenflaws > 0) {
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
}