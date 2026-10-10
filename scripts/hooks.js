import {o13Roll} from "./roll.js";
import {utils} from "./utils.js";

export function onO13Hooks() {
	Hooks.once("ready", async () => {
		game.user.character?.syncScreenBorder();
	});
	
	Hooks.on("updateUser", async (user, change, options) => {
		if (user.id == game.user.id) {
			if (change?.hasOwnProperty("character")) {
				game.user.character?.syncScreenBorder();
			}
		}
	});
	
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
	
	Hooks.once("diceSoNiceReady", (dice3d) => {
		dice3d.addColorset({
			name: "o13-safe",
			description : game.i18n.localize("13omens.DSN.safeDice"),
			category : game.i18n.localize("13omens.13omens"),
			foreground: "#000000",
			background: "#7e7e7e",
			outline: "#000000",
			edge: "#000000",
			material: "wood"
		});
		
		dice3d.addColorset({
			name: "o13-omen",
			description : game.i18n.localize("13omens.DSN.omenDice"),
			category : game.i18n.localize("13omens.13omens"),
			foreground: "#000000",
			background: "#880808",
			outline: "#000000",
			edge: "#000000i",
			material: "wood"
		});
		
		const updateDSNDesignChoices = () => {
			const designs = utils.COMPATIBILITY.DSN.availableDesigns();
			const designIDs = Object.keys(designs).map(typeKey => Object.keys(designs[typeKey]).map(designKey => `${typeKey}.${designKey}`)).flat();
			const designChoices = Object.fromEntries(designIDs.map(key => [key, designs[key.split(".")[0]]?.[key.split(".")[1]]?.description]));
			
			game.settings.settings.get("13omens.customDSNdesign_safe").choices = designChoices;
			game.settings.settings.get("13omens.customDSNdesign_omen").choices = designChoices;
		}
		
		updateDSNDesignChoices();
		
		Hooks.on("updateSetting", (setting) => {
			if (setting.key == "dice-so-nice.worldDiceLibrary") {
				updateDSNDesignChoices();
			}
		})
	});
	
	Hooks.on("diceSoNiceRollStart", (id, data) => {
		for (const die of data.roll.dice) {
			utils.COMPATIBILITY.DSN.applyDiceDesign(die);
		}
	})
}