import {o13SheetMixin} from "../components/sheet.js";
import {o13WaitMixIn} from "../components/wait.js";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class o13tokenCreator extends o13WaitMixIn(o13SheetMixin(HandlebarsApplicationMixin(ApplicationV2))) {
	constructor (imageSource, options = {}) {
		super();
		
		this._imageSource = imageSource;
	}
	
	_configureRenderParts(options) {
		return {
			main: {
				template: `systems/13omens/templates/${"dialogues"}/${"tokenCreator"}.hbs`
			}
		};
	}
	
	_onRender(context, options) {
		super._onRender(context, options);
		
		this._initDragging();
	}
	
	_initDragging() {
		const placementImage = this.element.querySelector(".o13-placement-image");
		const containment = placementImage?.parentElement;
		
		const centerImage = () => {
			const containmentwidth = containment.clientWidth;
			const containmentheight = containment.clientHeight;
			const imagewidth = placementImage.naturalWidth;
			const imageheight = placementImage.naturalHeight;
			
			const left = (containmentwidth - imagewidth)/2;
			const top = (containmentheight - imageheight)/2;
			
			placementImage.style.left = `${left}px`;
			placementImage.style.top = `${top}px`;
		}
		
		if (placementImage.complete) {
			centerImage();
		}
		else {
			placementImage.addEventListener("load", centerImage, { once: true });
		}
		
		if (placementImage && containment) {
			let isDragging = false;
			let startx;
			let starty;
			let startleft;
			let starttop;
			
			placementImage.addEventListener("pointerdown", (event) => {
				isDragging = true;
				placementImage.setPointerCapture(event.pointerId);
				
				startx = event.clientX;
				starty = event.clientY;
				
				startleft = parseFloat(placementImage.style.left);
				starttop = parseFloat(placementImage.style.top);
			})
			
			placementImage.addEventListener("pointermove", (event) => {
				if (isDragging) {
					const deltax = event.clientX - startx;
					const deltay = event.clientY - starty;
					
					placementImage.style.left = `${startleft + deltax}px`;
					placementImage.style.top = `${starttop + deltay}px`;
				}
			});
			
			placementImage.addEventListener("pointerup", (event) => {
				if (isDragging) {
					isDragging = false;
					placementImage.releasePointerCapture(event.pointerId);
				}
			});
			
			placementImage.addEventListener("mousewheel", (event) => {
				const scale = parseFloat(placementImage.style.scale);
				const newscale = Math.clamp(scale + Math.sign(event.wheelDelta) * 0.05, 0.1, 5);
				
				placementImage.style.scale = `${newscale}`;
			});
		}
	}
	
	async saveToken() {
		const placementImage = this.element.querySelector(".o13-placement-image");
		const containment = placementImage?.parentElement;
		
		const outerRing = this.element.querySelector(".o13-token-ring.o13-outer");
		const innerRing = this.element.querySelector(".o13-token-ring.o13-inner");
		
		const tokenSize = parseFloat(getComputedStyle(outerRing).width);
		const canvas = document.createElement("canvas");
		canvas.width = tokenSize;
		canvas.height = tokenSize;
		const context = canvas.getContext("2d");
		
		const containmentwidth = containment.clientWidth;
		const containmentheight = containment.clientHeight;
		
		const ringLeft = (containmentwidth - tokenSize) / 2;
		const ringTop = (containmentheight - tokenSize) / 2;
		
		const imageLeft = parseFloat(placementImage.style.left);
		const imageTop = parseFloat(placementImage.style.top);
		const imageScale = parseFloat(placementImage.style.scale);
		
		const drawWidth = placementImage.naturalWidth * imageScale;
		const drawHeight = placementImage.naturalHeight * imageScale;
		
		context.save();
		context.beginPath();
		context.arc(tokenSize / 2, tokenSize / 2, tokenSize / 2, 0, Math.PI * 2);
		context.clip();
		
		context.drawImage(
			placementImage,
			imageLeft - ringLeft,
			imageTop - ringTop,
			drawWidth,
			drawHeight
		);
		context.restore();
		
		const outerRingColor = getComputedStyle(outerRing).borderColor;
		const innerRingColor = getComputedStyle(innerRing).borderColor;
		
		const outerRingWidth = parseFloat(getComputedStyle(outerRing).borderWidth);
		context.beginPath();
		context.arc(tokenSize / 2, tokenSize / 2, (tokenSize - outerRingWidth) / 2, 0, Math.PI * 2);
		context.lineWidth = outerRingWidth;
		context.strokeStyle = outerRingColor;
		context.stroke();
		
		const innerRingSize = parseFloat(getComputedStyle(innerRing).width);
		const innerRingWidth = parseFloat(getComputedStyle(innerRing).borderWidth);
		context.beginPath();
		context.arc(tokenSize / 2, tokenSize / 2, (innerRingSize - innerRingWidth) / 2, 0, Math.PI * 2);
		context.lineWidth = innerRingWidth;
		context.strokeStyle = innerRingColor;
		context.stroke();	

		let path = undefined;
		
		canvas.toBlob(async (blob) => {
			if (!blob) {
				ui.notifications.error("Token could not be created");
				return;
			}

			const fileName = `token-${Date.now()}.webp`;
			const filePath = `worlds/${game.world.id}`;
			const file = new File([blob], fileName, { type: "image/webp" });

			try {
				const response = await FilePicker.upload("data", filePath, file);
				ui.notifications.info(`Token saved successfully to ${response.path}`);
				console.log("Saved token file to:", response.path);
				path = response.path;
			} catch (err) {
				console.error("Failed to upload token file:", err);
				ui.notifications.error("Could not save token file.");
			}
		}, "image/webp", 0.95);
		
		return path;
	}
	
	get imageSource() {
		return this._imageSource;
	}
	
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		
		context.creator = this;
		
		return context;
	}
	
	async setToken() {
		this.saveToken();
	}
}