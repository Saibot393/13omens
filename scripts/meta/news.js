const NEWS = {
	"welcome_prerelease" : {
		"contentKey" : "welcome_prerelease"
	}
}

function hasNewsContent(contentKey) {
	return game.i18n.has("13omens.news." +contentKey + ".title") && game.i18n.has("13omens.news." +contentKey + ".text");
}

function wrapedNews(contentKey) {
	const contentTitle = game.i18n.localize("13omens.news." + contentKey + ".title");
	const contentText = game.i18n.localize("13omens.news." + contentKey + ".text");
	
	return `<div class="o13-sheet o13-bordered o13-content-centered"> <span class="o13-label o13-header-label"> ${contentTitle} </span> <span class="o13-label"> ${contentText} </span></div>`
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
		if (!game.user.isGM) return;
		
		let changed = false;
		
		const sentNews = foundry.utils.deepClone(game.settings.get("13omens", "sentNews"));
		
		for (const key of Object.keys(NEWS)) {
			if (!sentNews[key]) {
				sentNews[key] = {status : "unsent"};
				changed = true;
			}
			
			if (NEWS[key].skip && sentNews[key].status == "unsent") {
				sentNews[key].status = "skipped";
				changed = true;
			}
			
			if (sentNews[key].status == "skipped") continue;
			
			if (sentNews[key].status != "sent") {
				if (hasNewsContent(NEWS[key].contentKey)) {
					await ChatMessage.create({
						content : wrapedNews(NEWS[key].contentKey),
						speaker : { alias : game.i18n.localize("13omens.titles.systemNews")}
					})
					
					sentNews[key].status = "sent";
					sentNews[key].sentInfo = {
						systemVersion : game.system.version,
						gameVersion : game.version
					}
					changed = true;
				}
			}
		}
		
		if (changed) await game.settings.set("13omens", "sentNews", sentNews);
	})
}