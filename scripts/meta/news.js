const NEWS = {
	welcome_prerelease : {
		contentKey : "welcome_prerelease",
		skip : false, //optional
		startDate : null, //optional
		endDate : null, //optional
		additionals : {}, //optional
		customContent : null
	}
}

export class o13News {
	static hasNewsContent(contentKey) {
		if (!contentKey) return false;
		return game.i18n.has("13omens.news." +contentKey + ".title") && game.i18n.has("13omens.news." +contentKey + ".text");
	}

	static wrapedNews(contentKey, add = {}) {
		const contentTitle = game.i18n.localize("13omens.news." + contentKey + ".title");
		const contentText = game.i18n.localize("13omens.news." + contentKey + ".text");
		
		const additionals = typeof add == "object" ? add : {};
		
		return `<div class="o13-sheet o13-bordered o13-content-centered"> 
					${additionals.before ?? ""}
					<span class="o13-label o13-header-label"> 
						${contentTitle} 
					</span> 
					${additionals.middle ?? ""}
					<span class="o13-label"> 
						${contentText} 
					</span>
					${additionals.after ?? ""}
				</div>`
	}

	static async sendNews(key) {
		try {
			if (o13News.hasNewsContent(NEWS[key]?.contentKey) || NEWS[key].customContent) {
				const wrappedContent = NEWS[key].customContent ? NEWS[key].customContent() : o13News.wrapedNews(NEWS[key].contentKey, NEWS[key].additionals);
				
				await ChatMessage.create({
					content : wrappedContent,
					speaker : { alias : game.i18n.localize("13omens.titles.systemNews")}
				})
				
				return true;
			}
			else {
				console.error(`13 omens news lacks content for key ${key}`);
				return false;
			}
		} catch(error) {
			console.error(`13 omens news failed to send message with error:`, error);
			return false;
		}
	}

	static resetNews() {
		game.settings.set("13omens", "sentNews", {})
	}

	static async checkNews(checkDate) {
		const now = checkDate ?? new Date();
			
		let changed = false;
		
		const sentNews = foundry.utils.deepClone(game.settings.get("13omens", "sentNews") ?? {});
		
		for (const key of Object.keys(NEWS)) {
			if (!sentNews[key]) {
				sentNews[key] = {status : "unsent"}; //make sure we even have an object to work on
				changed = true;
			}
			
			if (sentNews[key].status == "sent") continue; //if message already sent we can simply continue
			if (sentNews[key].status == "skipped") continue; //if message was skipped we can also continue
			
			let skip = NEWS[key].skip; //some messages may simply be skipped outright, e.g. if they are outdated
			
			if (NEWS[key].startDate) {
				const startDate = new Date(NEWS[key].startDate);
				
				if (now < startDate) continue; //we will not yet handle this message
			}
			
			if (NEWS[key].endDate) {
				const endDate = new Date(NEWS[key].endDate);
				
				if (endDate < now) skip = true; //this message will never have to be looked at again
			}
			
			if (skip && sentNews[key].status == "unsent") { //this message is marked as skipped, so we will skip it now and forever
				sentNews[key].status = "skipped";
				changed = true;
				continue;
			}
			
			//we are not to early and we do not skip it for any reason, so post the message
			const newsSent = await o13News.sendNews(key);
			
			//save the infor for the now sent message
			if (newsSent) {
				sentNews[key].status = "sent";
				sentNews[key].sentInfo = {
					systemVersion : game.system.version,
					gameVersion : game.version,
					date : new Date().toISOString()
				}
				changed = true;
			}
		}
		
		if (changed) await game.settings.set("13omens", "sentNews", sentNews);	
	}
}

export function initNews() {
	game.settings.register("13omens", "sentNews", {
		name : "",
		scope : "world",
		config : false,
		type : Object,
		default : {}
	});
	
	Hooks.once("ready", async () => {
		if (game.users.activeGM != game.user) return;
		
		o13News.checkNews();
	})
}