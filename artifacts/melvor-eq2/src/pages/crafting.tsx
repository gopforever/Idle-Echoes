  const scrollItems = invItems.filter(i => i.type === "recipe_scroll");
  const invMap = new Map(invItems.map(i => [i.id, i]));
  const bagMap = new Map(bagItems.map(b => [b.itemId, b]));

  // Combined total = inventory + gathering bag
  function totalOwned(itemId: string): number {
    return (invMap.get(itemId)?.quantity as number ?? 0) + (bagMap.get(itemId)?.quantity ?? 0);
  }

  const canCraft = (recipe: CraftingRecipe): boolean => {
    const skill = skills.find(s => s.id === recipe.requiredSkillId);
    if (!skill || (skill.level ?? 0) < recipe.requiredSkillLevel) return false;
    for (const ing of recipe.ingredients) {
      if (totalOwned(ing.itemId) < ing.quantity) return false;
    }
    return true;
  };

  const filteredRecipes = recipes.filter(r => {
    if (tierFilter !== "all" && r.tier !== tierFilter) return false;
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (showCraftableOnly && !canCraft(r)) return false;
    return true;
  });