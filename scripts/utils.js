export class utils {
	static lowest(numbers, n) {
		return [...numbers].sort((a, b) => a-b).slice(0, n);
	}

	static highest(numbers, n) {
		return [...numbers].sort((a, b) => b-a).slice(0, n);
	}
	
	static indexesof(number, search) {
		const buffer = [...number];
		
		const indexes = [];
		
		for (const s of search) {
			const index = buffer.indexOf(s);		
			indexes.push(index);
			buffer[index] = Symbol("checked");
		}
		
		return indexes;
	}
	
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
		data.flaws = data.flaws.map(flaw => typeof flaw == "string" ? {name : flaw} : flaw);
		if (typeof data.taskDifficulty == "string") {
			switch (data.taskDifficulty.toLowerCase().replaceAll(" ", "")) {
				case "veryeasy": data.taskDifficulty = -2; break;
				case "easy": data.taskDifficulty = -1; break;
				case "average": data.taskDifficulty = 0; break;
				case "hard": data.taskDifficulty = 1; break;
				case "veryhard": data.taskDifficulty = 2; break;
				default: data.taskDifficulty = 0;
			}
		}
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
			combine.rollbehaviour = {
				redrawomendice : combine.rollbehaviour.redrawomendice + modifier.rollbehaviour.redrawomendice,
				rerolls : combine.rollbehaviour.rerolls + modifier.rollbehaviour.rerolls,
				flawhnl : combine.rollbehaviour.flawhnl || modifier.rollbehaviour.flawhnl//use highest and lowest dice when rolling with flaw
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
	
	static tolerantJSONparse(string) {
		//RECOMMENDATION: Always use this in a try to be certain
		
		if (!string || typeof string != "string") {
			throw new Error("Not a parsable string:" + string);
			return {};
		}
		else {
			let cleaned = string.trim();
			
			cleaned = cleaned.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"'); //replace ' with "
			
			cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":'); //"" for keys
			
			cleaned = cleaned.replace(/:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*[,}])(?!\s*(?:true|false|null))/g, ':"$1"'); //"" for word values
			
			cleaned = cleaned.replace(/,\s*([}\]])/g, '$1'); //remove trailing ,
			
			return JSON.parse(cleaned);
		}
	}
	
	static currentActor(type = "pc") {
		//controlled token
		let Actor = canvas.tokens.controlled.map(t => t.actor).find(a => a?.isOwner && (!type || a.type == type));
		
		//set character
		if (!Actor) {
			Actor = game.user.character;
			if (type && Actor?.type != type) Actor = undefined;
		}
		
		//opened sheets
		if (!Actor) {
			const actorSheets = [...foundry.applications.instances].map(a => a?.[1]).filter(a => a?.actor?.isOwner);
			
			const sortedSheets = actorSheets.sort((a, b) => {
				const za = a?.element?.style?.zIndex || 0;
				const zb = b?.element?.style?.zIndex || 0;
				return zb - za;
			});

			Actor = sortedSheets.map(a => a.actor).find(a => !type || a.type == type);
		}
		
		//owned actors
		if (!Actor && !game.user.isGM) {
			[...game.actors].find(a => a.isOwner && (!type || a.type == type));
		}
		
		return Actor;
	}
}