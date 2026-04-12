import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import characterRouter from "./character.js";
import combatRouter from "./combat.js";
import inventoryRouter from "./inventory.js";
import skillsRouter from "./skills.js";
import itemsRouter from "./items.js";
import craftingRouter from "./crafting.js";
import gameRouter from "./game.js";
import creationRouter from "./creation.js";
import abilitiesRouter from "./abilities.js";
import achievementsRouter from "./achievements.js";
import shopRouter from "./shop.js";
import zonesRouter from "./zones.js";
import factionsRouter from "./factions.js";
import aaRouter from "./aa.js";
import heroicRouter from "./heroic.js";
import adornmentsRouter from "./adornments.js";
import collectionsRouter from "./collections.js";
import mountsRouter from "./mounts.js";
import worldRouter, { worldPublicRouter } from "./world.js";
import gmRouter from "./gm.js";
import dungeonsRouter from "./dungeons.js";
import raidsRouter from "./raids.js";
import portraitRouter from "./portrait.js";
import auctionRouter from "./auction.js";
import leaderboardRouter from "./leaderboard.js";
import bankRouter from "./bank.js";
import gatheringRouter from "./gathering.js";
import gatheringBagRouter from "./gathering-bag.js";
import bestiaryRouter from "./bestiary.js";
import settingsRouter from "./settings.js";
import gearSetsRouter from "./gear-sets.js";
import guildRouter from "./guild.js";
import tradeskillsRouter from "./tradeskills.js";
import epicQuestsRouter from "./epicQuests.js";
import { requireAuth } from "../middleware/auth.js";

const router: IRouter = Router();

// Public routes — no auth required
router.use(healthRouter);
router.use(authRouter);
router.use(leaderboardRouter);
router.use(worldPublicRouter);

// Character creation options are public (so users can browse before picking a char)
// Character creation POST requires login (handled inside creationRouter)
router.use(creationRouter);

// Game routes — require authenticated session with an active character
const gameRoutes = Router();
gameRoutes.use(requireAuth);
gameRoutes.use(characterRouter);
gameRoutes.use(combatRouter);
gameRoutes.use(inventoryRouter);
gameRoutes.use(skillsRouter);
gameRoutes.use(itemsRouter);
gameRoutes.use(craftingRouter);
gameRoutes.use(gameRouter);
gameRoutes.use(abilitiesRouter);
gameRoutes.use(achievementsRouter);
gameRoutes.use(shopRouter);
gameRoutes.use(zonesRouter);
gameRoutes.use(factionsRouter);
gameRoutes.use(aaRouter);
gameRoutes.use(heroicRouter);
gameRoutes.use(adornmentsRouter);
gameRoutes.use(collectionsRouter);
gameRoutes.use(mountsRouter);
gameRoutes.use(worldRouter);
gameRoutes.use(gmRouter);
gameRoutes.use(dungeonsRouter);
gameRoutes.use(raidsRouter);
gameRoutes.use(portraitRouter);
gameRoutes.use(auctionRouter);
gameRoutes.use(bankRouter);
gameRoutes.use(gatheringRouter);
gameRoutes.use(gatheringBagRouter);
gameRoutes.use(bestiaryRouter);
gameRoutes.use(settingsRouter);
gameRoutes.use(gearSetsRouter);
gameRoutes.use(tradeskillsRouter);
gameRoutes.use(guildRouter);
gameRoutes.use(epicQuestsRouter);

router.use(gameRoutes);

export default router;
