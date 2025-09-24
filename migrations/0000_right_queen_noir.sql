CREATE TABLE "fixtures" (
	"id" integer PRIMARY KEY NOT NULL,
	"referee" text,
	"timezone" text,
	"date" timestamp NOT NULL,
	"timestamp" integer,
	"status" text NOT NULL,
	"elapsed" integer,
	"round" text,
	"home_team_id" integer,
	"away_team_id" integer,
	"league_id" integer,
	"venue" text,
	"home_score" integer,
	"away_score" integer,
	"halftime_home_score" integer,
	"halftime_away_score" integer
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"logo" text,
	"flag" text,
	"season" integer NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" integer,
	"home_win_probability" numeric(5, 2),
	"draw_probability" numeric(5, 2),
	"away_win_probability" numeric(5, 2),
	"expected_goals_home" numeric(4, 2),
	"expected_goals_away" numeric(4, 2),
	"both_teams_score" numeric(5, 2),
	"over_25_goals" numeric(5, 2),
	"confidence" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scraped_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"data_type" text NOT NULL,
	"fixture_id" integer,
	"team_id" integer,
	"data" jsonb NOT NULL,
	"confidence" numeric(5, 2) NOT NULL,
	"scraped_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "scraped_data_unique" UNIQUE("source","data_type","fixture_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "standings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" integer,
	"team_id" integer,
	"position" integer NOT NULL,
	"points" integer NOT NULL,
	"played" integer NOT NULL,
	"wins" integer NOT NULL,
	"draws" integer NOT NULL,
	"losses" integer NOT NULL,
	"goals_for" integer NOT NULL,
	"goals_against" integer NOT NULL,
	"goal_difference" integer NOT NULL,
	"form" text,
	CONSTRAINT "standings_league_team_unique" UNIQUE("league_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "team_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" integer,
	"league_id" integer,
	"attack_rating" integer,
	"defense_rating" integer,
	"overall_rating" numeric(5, 2),
	"average_goals_scored" numeric(4, 2),
	"average_goals_conceded" numeric(4, 2),
	"clean_sheets" integer,
	"form" text,
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "team_stats_team_league_unique" UNIQUE("team_id","league_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"country" text,
	"founded" integer,
	"national" boolean DEFAULT false,
	"logo" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_stats" ADD CONSTRAINT "team_stats_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_stats" ADD CONSTRAINT "team_stats_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fixtures_status_idx" ON "fixtures" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fixtures_league_idx" ON "fixtures" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "fixtures_date_idx" ON "fixtures" USING btree ("date");--> statement-breakpoint
CREATE INDEX "predictions_fixture_idx" ON "predictions" USING btree ("fixture_id");--> statement-breakpoint
CREATE INDEX "scraped_data_source_type_idx" ON "scraped_data" USING btree ("source","data_type");