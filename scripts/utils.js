export class utils {
	static randomPermut(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			
			[array[i], array[j]] = [array[j], array[i]];
		}
		
		return array;
	}

	static counttobag(count) {
		let bag = [];
		
		for (let key of Object.keys(count)) {
			for (let i = 1; i <= count[key]; i++) {
				bag.push(key);
			}
		}
		
		return bag;
	}
	
	static expandRollData(data) {
		data.flaws = data.flaws.map(flaw => typeof flaw == "string" ? {name : flaw} : flaw)
	}
	
	static async enrichHTMLStructure(data, options = {}) {
		if (typeof data == "string") {
			return await foundry.applications.ux.TextEditor.implementation.enrichHTML(data, {async : true, ...options});
		}
		
		if (Array.isArray(data)) {
			return await Promise.all(data.map(entry => utils.enrichHTMLStructure(entry, options)));
		}
		
		if (typeof data == "object" && data != null) {
			const entries = Object.entries(data);
			
			const enriched = await Promise.all(entries.map(async ([key, entry]) => [key, await utils.enrichHTMLStructure(entry, options)]));
			
			return Object.fromEntries(enriched);
		}
		
		return data;
	}
	
	static async createHBSChatMessage(hbsData, messageData, HBS) {
		const preparedHBS = {...hbsData};
		
		if (preparedHBS.enrichables) {
			preparedHBS.enriched = await utils.enrichHTMLStructure(preparedHBS.enrichables);
		}
		
		const template = await foundry.applications.handlebars.renderTemplate(`systems/13omens/templates/${HBS}.hbs`, preparedHBS);

		return ChatMessage.create({
			...messageData,
			content : template
		})
	}
	
	static combineRollModifiers(modifiers) {
		const combine = foundry.utils.deepClone(CONFIG["13OMENS"].DEFAULTROLLMODIFIERS)
		
		for (const modifier of modifiers) {
			combine.addflaws = [...combine.addflaws, ...modifier.addflaws];
			combine.addedges = [...combine.addedges, ...modifier.addedges];
			combine.nostrain = Boolean(combine.nostrain || modifier.nostrain);
			combine.woundthreshold = modifier.woundthreshold ?? combine.woundthreshold;
			combine.strainthreshold = modifier.strainthreshold ?? combine.strainthreshold;
			combine.rollbehaviours = {
				redrawomendice : combine.rollbehaviours.redrawomendice + modifier.rollbehaviours.redrawomendice,
				rerolls : combine.rollbehaviours.rerolls + modifier.rollbehaviours.rerolls,
				flawhnl : combine.rollbehaviours.flawhnl || modifier.rollbehaviours.flawhnl//use highest and lowest dice when rolling with flaw
			}
		}
		
		return combine;
	}
	
	static rollOptionsFromModifiers(modifiers) {
		const base = foundry.utils.deepClone(CONFIG["13OMENS"].DEFAULTROLLOPTIONS);
		
		base.flaws = modifiers.addflaws ?? base.flaws;
		base.edges = modifiers.addedges ?? base.edges;
		base.ignoreStrain = modifiers.nostrain ?? base.ignoreStrain;
		base.woundThreshold = modifiers.woundthreshold ?? base.woundThreshold;
		base.strainThreshold = modifiers.strainthreshold ?? base.strainThreshold;
		base.rollbehaviour = {...base.rollbehaviour, ...modifiers.rollbehaviour};
		
		return base;
	}
	
	static combineRollOptions(configs) {
		const combine = foundry.utils.deepClone(CONFIG["13OMENS"].DEFAULTROLLOPTIONS);
		
		for (const config of configs) {
			combine.dicePermut = config.dicePermut ?? combine.dicePermut;
			if (config.flaws) combine.flaws = [...combine.flaws, ...config.flaws]
			if (config.edges) combine.edges = [...combine.edges, ...config.edges]
			combine.strain = config.strain ?? combine.strain;
			combine.ignoreStrain = Boolean(combine.ignoreStrain || config.ignoreStrain);
			combine.targetNumber = config.targetNumber ?? combine.targetNumber;
			if (!isNaN(config.taskDifficulty)) combine.taskDifficulty = combine.taskDifficulty + config.taskDifficulty;
			combine.taskRisk = config.taskRisk ?? combine.taskRisk;
			combine.woundThreshold = config.woundThreshold ?? combine.woundThreshold;
			combine.strainThreshold = config.strainThreshold ?? combine.strainThreshold;
			combine.rollbehaviour = {...combine.rollbehaviour, ...config.rollbehaviour}
		}
		
		return combine;
	}
}