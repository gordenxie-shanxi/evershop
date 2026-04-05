import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Add stacking_rule to coupon table
  // Values: 'exclusive' (cannot stack with other coupons) or 'stackable' (can stack)
  await execute(
    connection,
    `ALTER TABLE "coupon" ADD COLUMN IF NOT EXISTS "stacking_rule" varchar NOT NULL DEFAULT 'exclusive'`
  );

  // Add spend_tiers column for spend-and-save (满减) coupon type
  // JSONB array: [{"min_amount": 50, "discount_amount": 5}, {"min_amount": 100, "discount_amount": 15}]
  await execute(
    connection,
    `ALTER TABLE "coupon" ADD COLUMN IF NOT EXISTS "spend_tiers" jsonb DEFAULT NULL`
  );

  // Create standalone promotion table for promotions not tied to a coupon code
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "promotion" (
      "promotion_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "name" varchar NOT NULL,
      "description" varchar DEFAULT NULL,
      "status" boolean NOT NULL DEFAULT TRUE,
      "type" varchar NOT NULL,
      "priority" INT NOT NULL DEFAULT 0,
      "start_date" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "end_date" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "conditions" jsonb DEFAULT NULL,
      "actions" jsonb DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PROMOTION_UUID_UNIQUE" UNIQUE ("uuid")
    )`
  );

  // Create trigger to update promotion updated_at
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION update_promotion_updated_at()
      RETURNS TRIGGER
      LANGUAGE PLPGSQL
      AS
    $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$;`
  );

  await execute(
    connection,
    `DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'TRIGGER_UPDATE_PROMOTION_UPDATED_AT'
      ) THEN
        CREATE TRIGGER "TRIGGER_UPDATE_PROMOTION_UPDATED_AT"
        BEFORE UPDATE ON "promotion"
        FOR EACH ROW
        EXECUTE PROCEDURE update_promotion_updated_at();
      END IF;
    END
    $$;`
  );
};
