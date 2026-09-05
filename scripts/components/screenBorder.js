export function setScreenBorder(options = {state : undefined, visible : false, form : "ellipse"}) {
	let border = document.querySelector(".o13-screen-border");
	
	if (!border) {
		const template = document.createElement("template");
		template.innerHTML = "<div></div>";
		border = template.content.firstChild;
		border.classList.add("o13-screen-border");
		document.body.appendChild(border);
	}
	
	if (options.hasOwnProperty("visible")) {
		if (options.visible) {
			border.style.visibility = "";
		}
		else {
			border.style.visibility = "hidden";
		}
	}
	
	if (options.hasOwnProperty("form")) {
		border.classList.remove("o13-ellipse-shadow", "o13-rectangle-shadow");
		
		switch (options.form) {
			case "ellipse": border.classList.add("o13-ellipse-shadow"); break;
			case "rectangle": border.classList.add("o13-rectangle-shadow"); break;
		}
	}
	
	if (options.hasOwnProperty("state")) {
		let color = "transparent";
		
		switch (options.state) {
			case "dying": color = "var(--o13-omen-red)"; break;
			case "dead": color = "var(--o13-ink-black)"; break;
		}
		
		border.style.setProperty("--screen-border-color", color);
	}
	
	return border;
}

export function syncScreenBordertoSettings() {
	setScreenBorder({
		visible : game.settings.get("13omens", "screenBorder") != "off",
		form : game.settings.get("13omens", "screenBorder")
	});
}