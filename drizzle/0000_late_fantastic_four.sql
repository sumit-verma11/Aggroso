CREATE TABLE "ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow" text NOT NULL,
	"model" text NOT NULL,
	"prompt_hash" text NOT NULL,
	"raw_response" jsonb,
	"latency_ms" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"status" text NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"nutrition_item_id" uuid,
	"raw_extracted_name" text NOT NULL,
	"quantity" real NOT NULL,
	"unit" text NOT NULL,
	"preparation_method" text,
	"ai_calories" real NOT NULL,
	"calories" real NOT NULL,
	"ai_protein_g" real NOT NULL,
	"protein_g" real NOT NULL,
	"ai_carbs_g" real NOT NULL,
	"carbs_g" real NOT NULL,
	"ai_fat_g" real NOT NULL,
	"fat_g" real NOT NULL,
	"was_corrected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"meal_slot" text NOT NULL,
	"nutrition_item_id" uuid,
	"raw_extracted_name" text NOT NULL,
	"quantity" real NOT NULL,
	"unit" text NOT NULL,
	"calories" real NOT NULL,
	"protein_g" real NOT NULL,
	"carbs_g" real NOT NULL,
	"fat_g" real NOT NULL,
	"user_edited" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"target_date" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"raw_text" text NOT NULL,
	"meal_type" text NOT NULL,
	"logged_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_calories" real DEFAULT 0 NOT NULL,
	"total_protein_g" real DEFAULT 0 NOT NULL,
	"total_carbs_g" real DEFAULT 0 NOT NULL,
	"total_fat_g" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_name" text NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"serving_unit" text NOT NULL,
	"serving_grams" real NOT NULL,
	"calories" real NOT NULL,
	"protein_g" real NOT NULL,
	"carbs_g" real NOT NULL,
	"fat_g" real NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"source_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calorie_target" integer NOT NULL,
	"dietary_preferences" text[] DEFAULT '{}' NOT NULL,
	"allergies" text[] DEFAULT '{}' NOT NULL,
	"avoid_foods" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_nutrition_item_id_nutrition_items_id_fk" FOREIGN KEY ("nutrition_item_id") REFERENCES "public"."nutrition_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_items" ADD CONSTRAINT "meal_plan_items_plan_id_meal_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_items" ADD CONSTRAINT "meal_plan_items_nutrition_item_id_nutrition_items_id_fk" FOREIGN KEY ("nutrition_item_id") REFERENCES "public"."nutrition_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nutrition_items_canonical_name_idx" ON "nutrition_items" USING btree ("canonical_name");--> statement-breakpoint
CREATE INDEX "nutrition_items_aliases_idx" ON "nutrition_items" USING gin ("aliases");