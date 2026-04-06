function equipItem(character, item) {
    if (character.level < item.level) {
        return { status: 409, json: { error: `Requires level ${item.level} to equip` } };
    }
    // continue with equip logic...
}