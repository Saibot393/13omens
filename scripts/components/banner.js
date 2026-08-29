export async function showBanner(data = {content : {title : "", text : ""}, duration : null}) {
	if (!data.skipSocketCall) game.system.callSocket("showBanner", {...data, skipSocketCall : true});
	
	const duration = (data.duration ?? 3.5);
	
	const content = await foundry.applications.handlebars.renderTemplate("systems/13omens/templates/banner/banner.hbs", data.content);

	document.querySelector(".o13-banner")?.remove();
	
	const template = document.createElement("template");
	template.innerHTML = content;
	const banner = template.content.firstChild;
	
	banner.style.setProperty("--banner-duration", `${duration}s`);
	
	document.body.appendChild(banner);
	
	banner.addEventListener("animationend", () => {
		banner.remove();
	});
	
	return banner;
}