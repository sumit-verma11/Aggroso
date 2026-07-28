import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// --- profiles ---------------------------------------------------------

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  calorieTarget: integer("calorie_target").notNull(),
  dietaryPreferences: text("dietary_preferences")
    .array()
    .notNull()
    .default([]),
  allergies: text("allergies").array().notNull().default([]),
  avoidFoods: text("avoid_foods").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- nutrition knowledge base ------------------------------------------

export const nutritionItems = pgTable(
  "nutrition_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canonicalName: text("canonical_name").notNull(),
    aliases: text("aliases").array().notNull().default([]),
    servingUnit: text("serving_unit").notNull(),
    servingGrams: real("serving_grams").notNull(),
    calories: real("calories").notNull(),
    proteinG: real("protein_g").notNull(),
    carbsG: real("carbs_g").notNull(),
    fatG: real("fat_g").notNull(),
    source: text("source").notNull(),
    sourceId: text("source_id"),
    sourceVersion: text("source_version"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("nutrition_items_canonical_name_idx").on(table.canonicalName),
    index("nutrition_items_aliases_idx").using("gin", table.aliases),
  ]
);

// --- meals ---------------------------------------------------------------

export const mealTypeValues = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const;
export const mealStatusValues = ["draft", "confirmed"] as const;

export const meals = pgTable("meals", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  rawText: text("raw_text").notNull(),
  mealType: text("meal_type", { enum: mealTypeValues }).notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull(),
  status: text("status", { enum: mealStatusValues })
    .notNull()
    .default("draft"),
  totalCalories: real("total_calories").notNull().default(0),
  totalProteinG: real("total_protein_g").notNull().default(0),
  totalCarbsG: real("total_carbs_g").notNull().default(0),
  totalFatG: real("total_fat_g").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// meal_items: every nutrition-bearing field carries an `ai_<field>` value
// (the original computed estimate, immutable after insert) alongside the
// live `<field>` value (defaults to the ai_ value, overwritten on user
// correction). `wasCorrected` is set whenever they diverge. This preserves
// the AI's original estimate next to the user's correction without a
// separate audit table, per the assignment's requirement to keep both.
export const mealItems = pgTable("meal_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  mealId: uuid("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  nutritionItemId: uuid("nutrition_item_id").references(
    () => nutritionItems.id,
    { onDelete: "set null" }
  ),
  rawExtractedName: text("raw_extracted_name").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  preparationMethod: text("preparation_method"),

  aiCalories: real("ai_calories").notNull(),
  calories: real("calories").notNull(),
  aiProteinG: real("ai_protein_g").notNull(),
  proteinG: real("protein_g").notNull(),
  aiCarbsG: real("ai_carbs_g").notNull(),
  carbsG: real("carbs_g").notNull(),
  aiFatG: real("ai_fat_g").notNull(),
  fatG: real("fat_g").notNull(),

  wasCorrected: boolean("was_corrected").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- meal plans ------------------------------------------------------------

export const mealPlanStatusValues = ["draft", "approved", "rejected"] as const;

export const mealPlans = pgTable("meal_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  targetDate: text("target_date").notNull(), // ISO date (YYYY-MM-DD)
  status: text("status", { enum: mealPlanStatusValues })
    .notNull()
    .default("draft"),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
});

export const mealPlanItems = pgTable("meal_plan_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => mealPlans.id, { onDelete: "cascade" }),
  mealSlot: text("meal_slot", { enum: mealTypeValues }).notNull(),
  nutritionItemId: uuid("nutrition_item_id").references(
    () => nutritionItems.id,
    { onDelete: "set null" }
  ),
  rawExtractedName: text("raw_extracted_name").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  calories: real("calories").notNull(),
  proteinG: real("protein_g").notNull(),
  carbsG: real("carbs_g").notNull(),
  fatG: real("fat_g").notNull(),
  userEdited: boolean("user_edited").notNull().default(false),
});

// --- AI run log --------------------------------------------------------

export const aiRunWorkflowValues = ["extraction", "plan_generation"] as const;
export const aiRunStatusValues = ["ok", "error", "retry"] as const;

export const aiRuns = pgTable("ai_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflow: text("workflow", { enum: aiRunWorkflowValues }).notNull(),
  model: text("model").notNull(),
  promptHash: text("prompt_hash").notNull(),
  rawResponse: jsonb("raw_response"),
  latencyMs: integer("latency_ms"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  status: text("status", { enum: aiRunStatusValues }).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
