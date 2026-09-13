export async function initQuickPaster() {
	document.addEventListener("paste", async (event) => {
		if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
		
		const clipboardData = event.clipboardData || window.clipboardData;
		
		if (clipboardData) {
			const items = clipboardData.items;
			
			let imageFile;
			
			for (const item of items) {
				if (item?.type.includes("image")) {
					const image = item;
					imageFile = image?.getAsFile();
				}
				if (item?.type == "text/html") {
					const htmlImage = item;
					
					const ParsedDocument = new DOMParser().parseFromString(htmlImage, "text/html");
					const imageTag = ParsedDocument.querySelector("img");
					const imageURL = imageTag?.src;
					
					if (imageURL) {
						const fetched = await fetch(imageURL);
						if (fetched?.ok) {
							imageFile = await fetched.blob();
						}
					}
				}
				if (imageFile) break;
			}
			
			if (imageFile) {
				event.preventDefault();
				
				new foundry.applications.apps.FilePicker.implementation({
					type: "folder",
					current: `worlds/${game.world.id}`,
					callback: async (targetDirectory) => {
						const name = `screenshot-${Date.now()}.webp`;
						
						const file = new File([imageFile], name, {type : imageFile.type});
						
						try {
							await FilePicker.upload("data", targetDirectory, file, {});
							ui.notifications.notify(game.i18n.localize("13omens.errors.pasteUploaded"));
						} catch(error) {
							console.error(`Could not paste image due to error:`, error);
							ui.notifications.error(game.i18n.localize("13omens.errors.couldNotPaste"))
						}
					}
				}).render(true);
			}
		}
	})
}