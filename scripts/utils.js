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
}