function generateLoot(zone) {
    const minLevel = zone.levelBand.min;
    const maxLevel = zone.levelBand.max;
    return allItems.filter(item => item.level >= minLevel && item.level <= maxLevel);
}