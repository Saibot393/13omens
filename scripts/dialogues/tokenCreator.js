import {utils} from '../utils.js';

import {o13SheetMixin} from "../components/sheet.js";
import {o13WaitMixIn} from "../components/wait.js";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class o13tokenCreator extends o13WaitMixIn(o13SheetMixin(HandlebarsApplicationMixin(ApplicationV2))) {
	constructor (imageSource, options = {tokenName : "", directory : ""}) {
		super();
		
		this._imageSource = imageSource;
		
		this._options = options || {};
		
		this._randomID = foundry.utils.randomID();
	}

	static DEFAULT_OPTIONS = {
		position : {
			width : 650,
			height : 650
		}
	}
	
	get title() {
		return game.i18n.localize("13omens.titles.tokenCreator");
	}
	
	get tokenName() {
		const base = this._options?.tokenName || new Date().toISOString();
		
		return `${base}_${this._randomID}`;
	}
	
	get directory() {
		const directory = this._options.directory || game.settings.get("13omens", "tokenTargetDirectory")
		
		return directory;
	}

	get backgroundColor() {
		const backgroundColor = this.element.querySelector("[name=backgroundColor]");
		return backgroundColor.value;
	}

	get backgroundTransparency() {
		const backgroundTransparency = this.element.querySelector("[name=backgroundTransparency]");
		return 1 - backgroundTransparency.value;
	}

	get backgroundrgbaColor() {
		const hexColor = this.backgroundColor;
		const transparency = this.backgroundTransparency;

		const r = parseInt(hexColor.substring(1, 3), 16);
		const g = parseInt(hexColor.substring(3, 5), 16);
		const b = parseInt(hexColor.substring(5, 7), 16);

		return `rgba(${r}, ${g}, ${b}, ${transparency})`;
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
		
		this._initToken();
		this._initBackgroundPicker();
	}
	
	_initToken() {
		const placementImage = this.element.querySelector(".o13-placement-image");
		const containment = placementImage?.parentElement;
		
		placementImage.style.scale = "1";
		
		const centerImage = () => {
			requestAnimationFrame(() => {
				const containmentwidth = containment.clientWidth;
				const containmentheight = containment.clientHeight;
				const imagewidth = placementImage.offsetWidth;
				const imageheight = placementImage.offsetHeight;

				const left = (containmentwidth - imagewidth)/2;
				const top = (containmentheight - imageheight)/2;

				placementImage.style.left = `${left}px`;
				placementImage.style.top = `${top}px`;
			});
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
			
			placementImage.addEventListener("wheel", (event) => {
				event.preventDefault();
				
				const scale = parseFloat(placementImage.style.scale);
				const newscale = Math.clamp(scale - Math.sign(event.deltaY) * 0.05, 0.1, 5);
				
				placementImage.style.scale = `${newscale}`;
			});
		}
	}

	async _initBackgroundPicker() {
		const backgroundColor = this.element.querySelector("[name=backgroundColor]");
		const backgroundTransparency = this.element.querySelector("[name=backgroundTransparency]");

		backgroundColor.addEventListener("input", (event) => {this.updateBackground()});
		backgroundTransparency.addEventListener("input", (event) => {this.updateBackground()});
	}

	async updateBackground() {
		const rgbaColor = this.backgroundrgbaColor;

		const background = this.element.querySelector("[name=background]");
		background.style.backgroundColor = rgbaColor;
	}
	
	async saveToken(saveName = "", savePath = "") {
		//Drawing
		const placementImage = this.element.querySelector(".o13-placement-image");
		const containment = placementImage?.parentElement;
		
		const outerRing = this.element.querySelector(".o13-token-ring.o13-outer");
		const innerRing = this.element.querySelector(".o13-token-ring.o13-inner");
		
		const tokenSize = parseFloat(getComputedStyle(outerRing).width);
		const canvas = document.createElement("canvas");
		canvas.width = tokenSize;
		canvas.height = tokenSize;
		const context = canvas.getContext("2d");

		//draw background
		context.fillStyle = this.backgroundrgbaColor;
		context.beginPath();
		context.arc(tokenSize/2, tokenSize/2, tokenSize/2, 0, Math.PI * 2);
		context.fill();
		
		const containmentwidth = containment.clientWidth;
		const containmentheight = containment.clientHeight;
		
		const ringLeft = (containmentwidth - tokenSize) / 2;
		const ringTop = (containmentheight - tokenSize) / 2;
		
		const imageLeft = parseFloat(placementImage.style.left);
		const imageTop = parseFloat(placementImage.style.top);
		const imageScale = parseFloat(placementImage.style.scale);
		
		const visualImageLeft = imageLeft - placementImage.offsetWidth * (imageScale-1)/2;
		const visualImageTop = imageTop - placementImage.offsetHeight * (imageScale-1)/2;
		
		const drawWidth = placementImage.offsetWidth * imageScale;
		const drawHeight = placementImage.offsetHeight * imageScale;
		
		context.save();
		context.beginPath();
		context.arc(tokenSize / 2, tokenSize / 2, tokenSize / 2, 0, Math.PI * 2);
		context.clip();
		
		context.drawImage(
			placementImage,
			visualImageLeft - ringLeft,
			visualImageTop - ringTop,
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

		//Saving
		let path = undefined;
		
		const blob = await new Promise(resolve => {
			canvas.toBlob(resolve, "image/webp", 0.95)
		})
		
		if (!blob) {
			console.error("Failed to create token blob");
			ui.notifications.error(game.i18n.localize("13omens.errors.tokenNotCreated"));
		}
		else {
			const tokenName = `${utils.sanitiseFileName(this.tokenName)}.webp`;
			const directory = this.directory;
			const file = new File([blob], tokenName, { type: "image/webp" });

			try {
				await o13tokenCreator.ensureDirectory(directory);
				
				const response = await foundry.applications.apps.FilePicker.implementation.upload("data", directory, file);
				path = response?.path;
				console.log("Saved token file to:", path);
				ui.notifications.info(game.i18n.format("13omens.infos.tokenSaved", {path : path}));
			} catch (err) {
				console.error("Failed to upload token file:", err);
				ui.notifications.error(game.i18n.localize("13omens.errors.tokenNotSaved"));
			}
		}
		
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
		const path = await this.saveToken();
		
		this._resolveWait(path, true);
	}
	
	async cancel(event, target) {
		this.close();
	}
	
	static usercanUse(notification = false) {
		const canUse = game.user.hasPermission("FILES_UPLOAD");
		
		if (!canUse && notification) ui.notifications.warn(game.i18n.localize("13omens.warnings.usercantCreateFiles"))
			
		return canUse;
	}
	
	static async directoryExists(directory) {
		try {
			await foundry.applications.apps.FilePicker.implementation.browse("data", directory);
			return true;
		} catch (error) {
			return false;
		}
	}
	
	static async ensureDirectory(directory) {
		if (await this.directoryExists(directory)) {
			return true;
		}
		else {
			try {
				await foundry.applications.apps.FilePicker.implementation.createDirectory("data", directory);
				console.warn(`Target directory "${directory}" created`);
				return true;
			} catch (error) {
				console.error(`Target directory "${directory}" could not be created:`, error);
			}
		}
		
		return false;
	}
}