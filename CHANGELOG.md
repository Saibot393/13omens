## v1.3.2
- Fixed a bug with roll config not being completely respected by the roll config window
- Fixed a bug that causes valid edge configs to be displayed without names
- Added debug info to rolls

## v1.3.1
- Fixed bug that could prevent entered archetype relations to show up the pc background tab if no archetype was selected

## v1.3.0
- Perk can now apply active effects to change attributes (maximum wounds, selectable gear, cheat death amout) and roll modifiers (cheat death threshold, additional (omen)flaws, rerolls, redraws, ...) (detailed explanations/examples will follow shortly)
  - Perks will automatically deactive their active effects if not chosen or if used up
  - Active effects can be copied between perks via drag & drop
- Improved cheat death logic
- Added valiant sacrifice mechanic
- Roll config can now be skipped by holding SHIFT when clicking an aspect
- Added change act banner
  - Added setting to disable change act banner
- Added inline rolling (`@check[aspect_name|{config : here, for : example, taskDifficulty : hard}](check name here)`, detailed explanations/examples will follow shortly)
  - Inline checks can be posted to check by holding CTRL while clicking
- Added short hand for roll config
- Headers in enriched text will now have a more readable color
- Improved perk description enrichment
- Added some debug outputs

## v1.2.1
- remove console spam

## v1.2.0
- Added backstory tabs to archetype and pc sheets
  - PC backstory will be filled in from archetype upon selection
- Improved "is dead" logic for pcs
- Death will now be shown by skulls over/replacing the wound dice
- Hosts can now revive or kill player pcs in the wound-hover-over menu
- Added act menu to set omen dice threshold or if dice should be added when a new act start (menu shows when hovering over prologue)
- Gear can now be send to the chat by clicking the icon next to the name
- Gear can now be dragged from the pc sheet
- Gear can now be created directly from the pc sheet
- Input focus will now persist between sheet rerenders
- Improved/refactored drag and drop logic
  
## v1.1.0
- Fixed bug that prevented the last omen dice from being added to the dice bag
- Fixed bug with take wounds/cheat death buttons on chat rolls
- Improved color choice
- Edges/Flaws in roll config are now clickable at the title
- Transfer arrows in the story sheet are now pinned and have a higher distance
- Improved wound indicator on story sheet
- Small refactor for sheets code

## v1.0.0
- **First full release**
- System news framwork + welcome message
- v13 compatibility verification
- Migration framework
- Better proxy sheet updates
- Sheet drop improvements
- Small ui improvements
- -Small code refactoring

## v0.1.0
- Massive internal refactoring and clean up
- Constants and utils are now in a public name space
- Added uses system to perks
- Added autopopulate pcs to story sheet
- Added safety dialogues to certain actions
- Some css work

## v0.0.0
Innitial release
