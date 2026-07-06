/**
 * Curated mapping of everyday search terms to the canonical USDA entry that
 * cooks actually want. USDA's raw search returns hundreds of derivatives
 * ("rice cakes", "rice flour", "babyfood") before the real grain — this list
 * forces the staple to the top.
 *
 * Each entry maps short aliases (what the admin might type) to a precise
 * USDA query string that reliably returns the canonical Foundation /
 * SR Legacy row, plus a clean display name to override USDA's verbose label.
 *
 * Order matters: more specific aliases (e.g. "ground chicken") must come
 * before more general ones (e.g. "chicken") so they win the lookup.
 */

export type CommonFood = {
  /** Lowercase aliases that trigger this entry. First match wins. */
  aliases: string[]
  /** Clean human label shown in the picker (overrides USDA's description). */
  displayName: string
  /** Precise USDA search term — disambiguates from derivatives. */
  usdaQuery: string
  /** Optional reviewed record for searches where USDA ranks a derivative first. */
  fdcId?: number
}

export const COMMON_FOODS: CommonFood[] = [
  // ─── PROTEINS ───────────────────────────────────────────────
  { aliases: ['ground chicken'], displayName: 'Ground chicken, raw', usdaQuery: 'chicken ground raw' },
  { aliases: ['ground turkey', 'ground turkey 93', 'ground turkey 93%'], displayName: 'Ground turkey, 93% lean, raw', usdaQuery: 'turkey ground 93 lean 7 fat raw' },
  { aliases: ['ground turkey 99', 'lean ground turkey'], displayName: 'Ground turkey, 99% lean, raw', usdaQuery: 'turkey ground 99 lean 1 fat raw' },
  { aliases: ['ground beef', 'ground beef 85', 'ground beef 85%'], displayName: 'Ground beef, 85% lean, raw', usdaQuery: 'beef ground 85 lean 15 fat raw' },
  { aliases: ['ground beef 90', 'ground beef 90%'], displayName: 'Ground beef, 90% lean, raw', usdaQuery: 'beef ground 90 lean 10 fat raw' },
  { aliases: ['ground beef 93', 'ground beef 93%', 'lean ground beef'], displayName: 'Ground beef, 93% lean, raw', usdaQuery: 'beef ground 93 lean 7 fat raw' },

  { aliases: ['chicken breast', 'chicken breasts', 'raw chicken breast'], displayName: 'Chicken breast, boneless skinless, raw', usdaQuery: 'chicken broiler breast boneless skinless raw' },
  { aliases: ['cooked chicken breast', 'grilled chicken breast', 'baked chicken breast'], displayName: 'Chicken breast, boneless skinless, cooked', usdaQuery: 'chicken breast boneless skinless cooked roasted' },
  { aliases: ['chicken thigh', 'chicken thighs', 'raw chicken thigh'], displayName: 'Chicken thigh, boneless skinless, raw', usdaQuery: 'chicken broiler thigh boneless skinless raw' },
  { aliases: ['cooked chicken thigh'], displayName: 'Chicken thigh, boneless skinless, cooked', usdaQuery: 'chicken thigh boneless skinless cooked roasted' },

  { aliases: ['salmon', 'raw salmon', 'salmon fillet'], displayName: 'Salmon, Atlantic farmed, raw', usdaQuery: 'fish salmon atlantic farmed raw' },
  { aliases: ['cooked salmon', 'grilled salmon', 'baked salmon'], displayName: 'Salmon, Atlantic farmed, cooked', usdaQuery: 'fish salmon atlantic farmed cooked' },
  { aliases: ['tilapia'], displayName: 'Tilapia, raw', usdaQuery: 'fish tilapia raw' },
  { aliases: ['cod'], displayName: 'Cod, Atlantic, raw', usdaQuery: 'fish cod atlantic raw' },
  { aliases: ['shrimp'], displayName: 'Shrimp, raw', usdaQuery: 'crustaceans shrimp raw' },
  { aliases: ['tuna canned', 'canned tuna'], displayName: 'Tuna, canned in water, drained', usdaQuery: 'fish tuna light canned water drained solids' },

  { aliases: ['eggs', 'egg', 'whole eggs', 'eggs raw'], displayName: 'Egg, whole, raw, large', usdaQuery: 'egg whole raw fresh' },
  { aliases: ['egg whites', 'egg white', 'liquid egg whites'], displayName: 'Egg white, raw', usdaQuery: 'egg white raw fresh' },

  { aliases: ['pork chop', 'pork chops'], displayName: 'Pork loin chop, raw', usdaQuery: 'pork fresh loin center cut chops bone-in raw' },
  { aliases: ['pork tenderloin'], displayName: 'Pork tenderloin, raw', usdaQuery: 'pork fresh loin tenderloin raw' },
  { aliases: ['bacon'], displayName: 'Bacon, cooked', usdaQuery: 'pork cured bacon cooked' },

  { aliases: ['tofu', 'firm tofu'], displayName: 'Tofu, firm', usdaQuery: 'tofu raw firm prepared with calcium sulfate' },
  { aliases: ['tempeh'], displayName: 'Tempeh', usdaQuery: 'tempeh' },

  { aliases: ['whey protein', 'whey protein powder'], displayName: 'Whey protein powder, generic', usdaQuery: 'whey protein powder isolate' },

  // ─── GRAINS & STARCHES ─────────────────────────────────────
  { aliases: ['brown rice cooked', 'cooked brown rice'], displayName: 'Brown rice, long-grain, cooked', usdaQuery: 'rice brown long grain cooked' },
  { aliases: ['brown rice', 'brown rice raw', 'brown rice dry', 'dry brown rice'], displayName: 'Brown rice, long-grain, raw', usdaQuery: 'rice brown long grain raw' },
  { aliases: ['white rice cooked', 'cooked white rice'], displayName: 'White rice, long-grain, cooked', usdaQuery: 'rice white long grain regular cooked' },
  { aliases: ['white rice', 'white rice raw', 'white rice dry'], displayName: 'White rice, long-grain, raw', usdaQuery: 'rice white long grain regular raw' },
  { aliases: ['jasmine rice'], displayName: 'White rice, jasmine, cooked', usdaQuery: 'rice white long grain regular cooked' },
  { aliases: ['basmati rice'], displayName: 'White rice, basmati, cooked', usdaQuery: 'rice white long grain regular cooked' },

  { aliases: ['quinoa cooked', 'cooked quinoa'], displayName: 'Quinoa, cooked', usdaQuery: 'quinoa cooked' },
  { aliases: ['quinoa', 'quinoa raw', 'quinoa dry'], displayName: 'Quinoa, raw', usdaQuery: 'quinoa uncooked' },

  // USDA has no cooked-farro record in any reference database. Farro is
  // emmer wheat, so cooked farro maps to SR Legacy "Spelt, cooked" — a
  // sibling wheat species with matching macros (127 cal/100g cooked).
  // Dry farro has a true Foundation record.
  { aliases: ['farro cooked', 'cooked farro'], displayName: 'Farro, cooked (USDA spelt record)', usdaQuery: 'spelt cooked', fdcId: 169746 },
  { aliases: ['farro', 'farro dry', 'dry farro', 'farro raw', 'pearled farro'], displayName: 'Farro, pearled, dry', usdaQuery: 'farro pearled dry raw', fdcId: 2710828 },

  { aliases: ['rolled oats', 'old fashioned oats', 'oatmeal dry'], displayName: 'Oats, whole grain, rolled, old fashioned', usdaQuery: 'oats whole grain rolled old fashioned' },
  { aliases: ['oats', 'oatmeal', 'cooked oats', 'cooked oatmeal'], displayName: 'Oatmeal, cooked with water', usdaQuery: 'oats regular quick instant cooked with water' },

  { aliases: ['pasta cooked', 'cooked pasta', 'spaghetti cooked'], displayName: 'Pasta, cooked', usdaQuery: 'pasta cooked enriched without added salt' },
  { aliases: ['pasta', 'pasta dry', 'spaghetti', 'penne'], displayName: 'Pasta, dry', usdaQuery: 'pasta dry unenriched' },
  { aliases: ['whole wheat pasta', 'whole wheat pasta cooked'], displayName: 'Whole-wheat pasta, cooked', usdaQuery: 'spaghetti whole wheat cooked' },

  { aliases: ['whole wheat bread', 'wheat bread'], displayName: 'Whole-wheat bread', usdaQuery: 'bread whole wheat commercially prepared' },
  { aliases: ['white bread'], displayName: 'White bread', usdaQuery: 'bread white commercially prepared' },
  { aliases: ['sourdough bread', 'sourdough'], displayName: 'Sourdough bread', usdaQuery: 'bread french sourdough' },

  { aliases: ['flour tortilla', 'tortilla flour'], displayName: 'Flour tortilla', usdaQuery: 'tortillas flour wheat' },
  { aliases: ['corn tortilla', 'tortilla corn'], displayName: 'Corn tortilla', usdaQuery: 'tortillas corn ready-to-bake' },

  { aliases: ['sweet potato cooked', 'baked sweet potato'], displayName: 'Sweet potato, baked', usdaQuery: 'sweet potato cooked baked in skin without salt' },
  {
    aliases: ['sweet potato', 'sweet potatoes', 'raw sweet potato', 'raw sweet potatoes'],
    displayName: 'Sweet potato, raw',
    usdaQuery: 'sweet potato raw unprepared',
    fdcId: 168482,
  },
  { aliases: ['potato cooked', 'baked potato'], displayName: 'Potato, baked', usdaQuery: 'potatoes russet flesh and skin baked' },
  { aliases: ['potato', 'raw potato'], displayName: 'Potato, raw', usdaQuery: 'potatoes russet flesh and skin raw' },

  { aliases: ['couscous'], displayName: 'Couscous, cooked', usdaQuery: 'couscous cooked' },

  // ─── VEGETABLES ─────────────────────────────────────────────
  { aliases: ['broccoli'], displayName: 'Broccoli, raw', usdaQuery: 'broccoli raw' },
  { aliases: ['cauliflower'], displayName: 'Cauliflower, raw', usdaQuery: 'cauliflower raw' },
  { aliases: ['spinach'], displayName: 'Spinach, raw', usdaQuery: 'spinach raw' },
  { aliases: ['kale'], displayName: 'Kale, raw', usdaQuery: 'kale raw' },
  { aliases: ['romaine lettuce', 'romaine'], displayName: 'Romaine lettuce, raw', usdaQuery: 'lettuce cos romaine raw' },
  { aliases: ['iceberg lettuce', 'iceberg', 'lettuce'], displayName: 'Iceberg lettuce, raw', usdaQuery: 'lettuce iceberg raw' },
  { aliases: ['cherry tomato', 'grape tomato'], displayName: 'Cherry tomato, raw', usdaQuery: 'tomatoes red ripe raw year round average' },
  { aliases: ['tomato', 'tomatoes'], displayName: 'Tomato, raw', usdaQuery: 'tomatoes red ripe raw year round average' },
  { aliases: ['onion', 'yellow onion'], displayName: 'Onion, raw', usdaQuery: 'onions raw' },
  { aliases: ['chili powder'], displayName: 'Chili powder', usdaQuery: 'spices chili powder', fdcId: 171319 },
  { aliases: ['garlic powder'], displayName: 'Garlic powder', usdaQuery: 'spices garlic powder' },
  { aliases: ['garlic'], displayName: 'Garlic, raw', usdaQuery: 'garlic raw' },
  { aliases: ['bell pepper', 'red bell pepper', 'green bell pepper'], displayName: 'Bell pepper, raw', usdaQuery: 'peppers sweet red raw' },
  { aliases: ['jalapeno'], displayName: 'Jalapeño pepper, raw', usdaQuery: 'peppers jalapeno raw' },
  { aliases: ['cucumber'], displayName: 'Cucumber, with peel, raw', usdaQuery: 'cucumber with peel raw' },
  { aliases: ['celery'], displayName: 'Celery, raw', usdaQuery: 'celery raw' },
  { aliases: ['carrot', 'carrots'], displayName: 'Carrot, raw', usdaQuery: 'carrots raw' },
  { aliases: ['zucchini'], displayName: 'Zucchini, raw', usdaQuery: 'squash summer zucchini includes skin raw' },
  { aliases: ['mushroom', 'mushrooms', 'white mushroom'], displayName: 'White mushroom, raw', usdaQuery: 'mushrooms white raw' },
  { aliases: ['asparagus'], displayName: 'Asparagus, raw', usdaQuery: 'asparagus raw' },
  { aliases: ['brussels sprouts', 'brussel sprouts'], displayName: 'Brussels sprouts, raw', usdaQuery: 'brussels sprouts raw' },
  { aliases: ['cabbage'], displayName: 'Cabbage, raw', usdaQuery: 'cabbage raw' },
  { aliases: ['frozen corn', 'corn kernels'], displayName: 'Sweet corn, yellow, frozen', usdaQuery: 'corn sweet yellow frozen kernels off cob' },
  // Bare "corn" must pin to the vegetable: the generic scorer once ranked
  // "Oil, corn" above "Corn, sweet, raw" for an "ears corn" line (9x calories).
  { aliases: ['corn', 'ears corn', 'ears of corn', 'corn on the cob', 'fresh corn', 'sweet corn'], displayName: 'Sweet corn, yellow, raw', usdaQuery: 'corn sweet yellow raw', fdcId: 169998 },
  { aliases: ['canned corn', 'corn canned'], displayName: 'Sweet corn, canned, drained', usdaQuery: 'corn sweet yellow canned whole kernel drained solids' },
  { aliases: ['frozen peas', 'peas'], displayName: 'Green peas, frozen', usdaQuery: 'peas green frozen unprepared' },
  { aliases: ['green beans', 'string beans'], displayName: 'Green beans, raw', usdaQuery: 'beans snap green raw' },
  { aliases: ['avocado'], displayName: 'Avocado, raw', usdaQuery: 'avocados raw all commercial varieties' },

  // ─── FRUITS ─────────────────────────────────────────────────
  { aliases: ['apple', 'apples'], displayName: 'Apple, raw, with skin', usdaQuery: 'apples raw with skin' },
  { aliases: ['banana', 'bananas'], displayName: 'Banana, raw', usdaQuery: 'bananas raw' },
  { aliases: ['strawberry', 'strawberries'], displayName: 'Strawberries, raw', usdaQuery: 'strawberries raw' },
  {
    aliases: ['blueberry', 'blueberries'],
    displayName: 'Blueberries, raw',
    usdaQuery: 'blueberries raw',
    // Complete SR Legacy record; the newer Foundation row omits dietary fiber.
    fdcId: 171711,
  },
  { aliases: ['raspberry', 'raspberries'], displayName: 'Raspberries, raw', usdaQuery: 'raspberries raw' },
  { aliases: ['blackberry', 'blackberries'], displayName: 'Blackberries, raw', usdaQuery: 'blackberries raw' },
  { aliases: ['orange', 'oranges'], displayName: 'Orange, raw', usdaQuery: 'oranges raw navels' },
  {
    aliases: ['lemon juice'],
    displayName: 'Lemon juice, raw',
    usdaQuery: 'lemon juice raw',
    fdcId: 167747,
  },
  { aliases: ['lemon'], displayName: 'Lemon, raw', usdaQuery: 'lemons raw without peel' },
  { aliases: ['lime'], displayName: 'Lime, raw', usdaQuery: 'limes raw' },
  { aliases: ['mango'], displayName: 'Mango, raw', usdaQuery: 'mangos raw' },
  { aliases: ['pineapple'], displayName: 'Pineapple, raw', usdaQuery: 'pineapple raw all varieties' },
  { aliases: ['watermelon'], displayName: 'Watermelon, raw', usdaQuery: 'watermelon raw' },
  { aliases: ['cantaloupe'], displayName: 'Cantaloupe, raw', usdaQuery: 'melons cantaloupe raw' },
  { aliases: ['honeydew'], displayName: 'Honeydew melon, raw', usdaQuery: 'melons honeydew raw' },
  { aliases: ['kiwi', 'kiwifruit'], displayName: 'Kiwifruit, raw', usdaQuery: 'kiwifruit green raw' },
  { aliases: ['peach', 'peaches'], displayName: 'Peach, raw', usdaQuery: 'peaches raw' },
  { aliases: ['plum', 'plums'], displayName: 'Plum, raw', usdaQuery: 'plums raw' },
  { aliases: ['pear', 'pears'], displayName: 'Pear, raw', usdaQuery: 'pears raw' },
  { aliases: ['grape', 'grapes'], displayName: 'Grapes, red or green, raw', usdaQuery: 'grapes red or green raw european type' },

  // ─── DAIRY & ALTERNATIVES ──────────────────────────────────
  { aliases: ['whole milk'], displayName: 'Whole milk, 3.25% fat', usdaQuery: 'milk whole 3 25 milkfat with added vitamin d' },
  { aliases: ['2% milk', 'reduced fat milk'], displayName: '2% milk', usdaQuery: 'milk reduced fat fluid 2 milkfat with added vitamin a and vitamin d' },
  { aliases: ['skim milk', 'nonfat milk', 'fat free milk'], displayName: 'Skim milk', usdaQuery: 'milk nonfat fluid with added vitamin a and vitamin d fat free or skim' },
  { aliases: ['almond milk', 'unsweetened almond milk'], displayName: 'Almond milk, unsweetened', usdaQuery: 'beverages almond milk unsweetened' },
  { aliases: ['oat milk'], displayName: 'Oat milk', usdaQuery: 'beverages oat milk unsweetened' },
  { aliases: ['soy milk'], displayName: 'Soy milk, unsweetened', usdaQuery: 'soymilk unsweetened all flavors' },
  { aliases: ['greek yogurt', 'plain greek yogurt'], displayName: 'Greek yogurt, plain, nonfat', usdaQuery: 'yogurt greek plain nonfat' },
  { aliases: ['cottage cheese'], displayName: 'Cottage cheese, low-fat 2%', usdaQuery: 'cheese cottage lowfat 2 milkfat' },
  { aliases: ['cheddar cheese', 'cheddar'], displayName: 'Cheddar cheese', usdaQuery: 'cheese cheddar' },
  { aliases: ['mozzarella'], displayName: 'Mozzarella cheese, part skim', usdaQuery: 'cheese mozzarella part skim milk' },
  { aliases: ['parmesan', 'pecorino', 'romano'], displayName: 'Parmesan cheese, grated', usdaQuery: 'cheese parmesan grated' },
  { aliases: ['feta'], displayName: 'Feta cheese', usdaQuery: 'cheese feta' },
  { aliases: ['butter'], displayName: 'Butter, unsalted', usdaQuery: 'butter without salt' },
  { aliases: ['cream cheese'], displayName: 'Cream cheese', usdaQuery: 'cheese cream' },

  // ─── LEGUMES ───────────────────────────────────────────────
  { aliases: ['black beans canned', 'canned black beans', 'black beans'], displayName: 'Black beans, canned, drained', usdaQuery: 'beans black mature seeds canned low sodium drained solids' },
  { aliases: ['chickpeas canned', 'canned chickpeas', 'garbanzo beans', 'chickpeas'], displayName: 'Chickpeas, canned, drained', usdaQuery: 'chickpeas garbanzo beans bengal gram mature seeds canned drained solids' },
  { aliases: ['kidney beans canned', 'kidney beans'], displayName: 'Kidney beans, canned, drained', usdaQuery: 'beans kidney red mature seeds canned drained solids' },
  { aliases: ['pinto beans canned', 'pinto beans'], displayName: 'Pinto beans, canned, drained', usdaQuery: 'beans pinto mature seeds canned drained solids' },
  { aliases: ['cannellini beans', 'white beans canned', 'great northern beans'], displayName: 'Cannellini beans, canned, drained', usdaQuery: 'beans great northern mature seeds canned drained solids' },
  { aliases: ['lentils cooked', 'cooked lentils'], displayName: 'Lentils, cooked', usdaQuery: 'lentils mature seeds cooked boiled without salt' },
  { aliases: ['lentils', 'dry lentils', 'lentils raw'], displayName: 'Lentils, raw', usdaQuery: 'lentils raw' },
  { aliases: ['edamame'], displayName: 'Edamame, frozen', usdaQuery: 'edamame frozen prepared' },

  // ─── NUTS, SEEDS & FATS ────────────────────────────────────
  { aliases: ['olive oil', 'extra virgin olive oil'], displayName: 'Olive oil', usdaQuery: 'oil olive salad or cooking' },
  { aliases: ['avocado oil'], displayName: 'Avocado oil', usdaQuery: 'oil avocado' },
  { aliases: ['coconut oil'], displayName: 'Coconut oil', usdaQuery: 'oil coconut' },
  { aliases: ['canola oil', 'vegetable oil'], displayName: 'Canola oil', usdaQuery: 'oil canola' },
  { aliases: ['peanut butter'], displayName: 'Peanut butter, smooth', usdaQuery: 'peanut butter smooth style without salt' },
  { aliases: ['almond butter'], displayName: 'Almond butter, plain', usdaQuery: 'almond butter plain without salt added' },
  { aliases: ['almonds'], displayName: 'Almonds, raw', usdaQuery: 'nuts almonds raw' },
  { aliases: ['walnuts'], displayName: 'Walnuts, raw', usdaQuery: 'nuts walnuts english raw' },
  { aliases: ['cashews'], displayName: 'Cashews, raw', usdaQuery: 'nuts cashew nuts raw' },
  { aliases: ['pecans'], displayName: 'Pecans, raw', usdaQuery: 'nuts pecans raw' },
  { aliases: ['pistachios'], displayName: 'Pistachios, raw', usdaQuery: 'nuts pistachio nuts raw' },
  { aliases: ['chia seeds', 'chia'], displayName: 'Chia seeds, dried', usdaQuery: 'seeds chia seeds dried' },
  { aliases: ['flax seeds', 'flax', 'flaxseed'], displayName: 'Flax seeds', usdaQuery: 'seeds flaxseed' },
  { aliases: ['hemp seeds', 'hemp'], displayName: 'Hemp seeds, hulled', usdaQuery: 'seeds hemp hulled' },
  { aliases: ['pumpkin seeds'], displayName: 'Pumpkin seeds, roasted', usdaQuery: 'seeds pumpkin and squash seed kernels dried' },
  { aliases: ['sunflower seeds'], displayName: 'Sunflower seeds, roasted', usdaQuery: 'seeds sunflower seed kernels dried' },

  // ─── PANTRY ─────────────────────────────────────────────────
  { aliases: ['honey'], displayName: 'Honey', usdaQuery: 'honey' },
  { aliases: ['maple syrup'], displayName: 'Maple syrup', usdaQuery: 'syrups maple' },
  { aliases: ['white sugar', 'sugar'], displayName: 'Granulated sugar', usdaQuery: 'sugars granulated' },
  { aliases: ['brown sugar'], displayName: 'Brown sugar', usdaQuery: 'sugars brown' },
  { aliases: ['ap flour', 'all purpose flour', 'flour'], displayName: 'All-purpose flour', usdaQuery: 'wheat flour white all purpose enriched bleached' },
  { aliases: ['whole wheat flour'], displayName: 'Whole-wheat flour', usdaQuery: 'wheat flour whole grain soft wheat' },
  { aliases: ['almond flour'], displayName: 'Almond flour', usdaQuery: 'almond flour' },
  { aliases: ['soy sauce'], displayName: 'Soy sauce', usdaQuery: 'soy sauce made from soy and wheat shoyu' },
  { aliases: ['balsamic vinegar'], displayName: 'Balsamic vinegar', usdaQuery: 'vinegar balsamic' },
  { aliases: ['apple cider vinegar'], displayName: 'Apple cider vinegar', usdaQuery: 'vinegar cider' },
  { aliases: ['mayonnaise', 'mayo'], displayName: 'Mayonnaise', usdaQuery: 'salad dressing mayonnaise regular' },
  { aliases: ['mustard'], displayName: 'Yellow mustard', usdaQuery: 'mustard prepared yellow' },
  { aliases: ['ketchup'], displayName: 'Ketchup', usdaQuery: 'catsup' },
  // USDA has no generic unbranded Italian herb blend. Dried oregano is the
  // closest stable SR Legacy proxy and avoids the clearly wrong Italian salad
  // dressing match produced by a loose text search.
  { aliases: ['italian seasoning'], displayName: 'Italian seasoning (dried-herb proxy)', usdaQuery: 'spices oregano dried' },
  { aliases: ['hot sauce'], displayName: 'Hot sauce', usdaQuery: 'sauce hot chile sriracha' },
  { aliases: ['salsa'], displayName: 'Salsa, jarred', usdaQuery: 'sauce ready-to-serve pace picante' },
]

/**
 * Find the common-food entry whose alias best matches the search query.
 * Matches when query equals the alias, starts with it, or contains it as a
 * whole token group. Longer aliases win ties — "ground chicken" beats
 * "chicken" when the admin typed "ground chicken".
 */
export function matchCommonFood(query: string): CommonFood | null {
  const lower = query.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim()
  if (!lower) return null
  let best: { food: CommonFood; aliasLength: number } | null = null
  for (const food of COMMON_FOODS) {
    for (const alias of food.aliases) {
      const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim()
      const re = new RegExp(`(^|\\s)${normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`)
      if (re.test(lower) || lower === normalizedAlias) {
        if (!best || normalizedAlias.length > best.aliasLength) {
          best = { food, aliasLength: normalizedAlias.length }
        }
      }
    }
  }
  return best?.food ?? null
}
