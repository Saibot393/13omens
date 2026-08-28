const COREASPECTSIDS = ["courage", "evade", "fight", "luck", "perception"];
const ASPECTRATINGS = [-1, 0,1,2,3,4];
const ASPECTTN = [10, 9, 7, 5, 4];

const ARCHETYPEASPECTRATING = 4;

const DEFAULTMAXWOUNDS = 4;

const DEFAULTMAXHOSTOMENDICE = 13;

const DEFAULTDICEBAGCOUNT = {safe : 8, omen : 1 }

const DEFAULTACTOMENDCIETHRESHOLD = {
		0 : 0,
		1 : 1,
		2 : 4,
		3 : 8
};

const MAXFE = 2;

const MAXTD = 2;
const MINTD = -2;

const TASKRISKS = ["risky", "normal", "harmless"];

const DEFAULTROLLOPTIONS = {dicePermut : [], flaws : [], edges : [], strain : null, ignoreStrain : false, targetNumber : null, taskDifficulty : 0, taskRisk : "normal", woundThreshold : null, strainThreshold : null, rollbehaviour : {}};

const DEFAULTROLLMODIFIERS = {
	addflaws : [],
	addedges : [],
	nostrain : false,
	woundthreshold : null,
	strainthreshold : null,
	rollbehaviour : {
		redrawomendice : 0,
		rerolls : 0,
		flawhnl : false //use highest and lowest dice when rolling with flaw
	}
}

export const CONSTANTS = { COREASPECTSIDS, ASPECTRATINGS, ASPECTTN, ARCHETYPEASPECTRATING, DEFAULTMAXWOUNDS, DEFAULTMAXHOSTOMENDICE, DEFAULTDICEBAGCOUNT, DEFAULTACTOMENDCIETHRESHOLD, MAXFE, MAXTD, MINTD, TASKRISKS, DEFAULTROLLOPTIONS, DEFAULTROLLMODIFIERS };

export const templatePaths = ["actors/pc", "actors/components/pc_character", "actors/components/pc_background", "actors/story", "actors/components/aspects", "items/perk", "items/components/archetype_perksngear", "items/components/archetype_background", "dice/dice", "dice/dicebar", "dice/minidicebar", "dice/dicebag", "rolls/rollConfig", "rolls/chatRoll", "dialogues/general", "dialogues/confirmOmenDiceRoll", "chat/gear"].map((path) => `systems/13omens/templates/${path}.hbs`);