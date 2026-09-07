export class o13Token extends foundry.canvas.placeables.Token {
	_onClickLeft2(event) {
		if (this.actor?.freeView) {
			return this.actor.sheet.render(true);
		}
		
		return super._onClickLeft2(event)
	}
	
	_canView(user, event) {
		if (this.actor?.freeView) {
			return true;
		}
		
		return super._canView(user, event);
	}
}