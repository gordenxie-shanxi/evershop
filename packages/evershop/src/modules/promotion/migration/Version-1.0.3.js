import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Create customer_coupon_use table if it doesn't exist
  // This is referenced in the existing timeUsedValidator but may be missing
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "customer_coupon_use" (
      "id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "customer_id" INT NOT NULL,
      "coupon_id" INT,
      "coupon" varchar NOT NULL,
      "used_time" INT NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UNIQUE_CUSTOMER_COUPON_ID" UNIQUE ("customer_id", "coupon_id")
    )`
  );

  await execute(
    connection,
    `ALTER TABLE "customer_coupon_use" ADD COLUMN IF NOT EXISTS "coupon_id" INT`
  );

  await execute(
    connection,
    `ALTER TABLE "customer_coupon_use" ALTER COLUMN "used_time" SET DEFAULT 0`
  );

  await execute(
    connection,
    `UPDATE "customer_coupon_use" ccu
      SET "coupon_id" = c."coupon_id"
      FROM "coupon" c
      WHERE ccu."coupon_id" IS NULL
        AND ccu."coupon" = c."coupon"`
  );

  await execute(
    connection,
    `ALTER TABLE "customer_coupon_use" DROP CONSTRAINT IF EXISTS "UNIQUE_CUSTOMER_COUPON"`
  );

  await execute(
    connection,
    `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_CUSTOMER_COUPON_USE_CUSTOMER_COUPON_ID"
      ON "customer_coupon_use" ("customer_id", "coupon_id")`
  );

  await execute(
    connection,
    `INSERT INTO "customer_coupon_use" (
      "customer_id",
      "coupon_id",
      "coupon",
      "used_time"
    )
    SELECT
      o."customer_id",
      c."coupon_id",
      o."coupon",
      COUNT(*)::INT AS "used_time"
    FROM "order" o
    INNER JOIN "coupon" c ON c."coupon" = o."coupon"
    WHERE o."customer_id" IS NOT NULL
      AND o."coupon" IS NOT NULL
      AND o."payment_status" = 'paid'
    GROUP BY o."customer_id", c."coupon_id", o."coupon"
    ON CONFLICT ("customer_id", "coupon_id")
    DO UPDATE SET
      "coupon" = EXCLUDED."coupon",
      "used_time" = EXCLUDED."used_time",
      "updated_at" = CURRENT_TIMESTAMP`
  );

  // Create index for performance
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_CUSTOMER_COUPON_USE_CUSTOMER_ID" ON "customer_coupon_use" ("customer_id")`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_CUSTOMER_COUPON_USE_COUPON" ON "customer_coupon_use" ("coupon")`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_CUSTOMER_COUPON_USE_COUPON_ID" ON "customer_coupon_use" ("coupon_id")`
  );

  // Track customer coupon usage only when an order is paid.
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION track_customer_coupon_use()
      RETURNS TRIGGER
      LANGUAGE PLPGSQL
      AS
    $$ 
    DECLARE matched_coupon_id INT;
    BEGIN
      IF NEW.coupon IS NULL OR NEW.customer_id IS NULL THEN
        RETURN NEW;
      END IF;

      SELECT "coupon_id"
      INTO matched_coupon_id
      FROM "coupon"
      WHERE "coupon" = NEW.coupon
      LIMIT 1;

      IF matched_coupon_id IS NULL THEN
        RETURN NEW;
      END IF;

      IF TG_OP = 'INSERT' THEN
        INSERT INTO "customer_coupon_use" ("customer_id", "coupon_id", "coupon", "used_time")
        VALUES (
          NEW.customer_id,
          matched_coupon_id,
          NEW.coupon,
          CASE WHEN NEW.payment_status = 'paid' THEN 1 ELSE 0 END
        )
        ON CONFLICT ("customer_id", "coupon_id")
        DO UPDATE SET "coupon" = EXCLUDED."coupon",
                      "updated_at" = CURRENT_TIMESTAMP,
                      "used_time" = customer_coupon_use.used_time +
                        CASE WHEN NEW.payment_status = 'paid' THEN 1 ELSE 0 END;
        RETURN NEW;
      END IF;

      IF NEW.payment_status = 'paid' AND COALESCE(OLD.payment_status, '') <> 'paid' THEN
        INSERT INTO "customer_coupon_use" ("customer_id", "coupon_id", "coupon", "used_time")
        VALUES (NEW.customer_id, matched_coupon_id, NEW.coupon, 1)
        ON CONFLICT ("customer_id", "coupon_id")
        DO UPDATE SET "coupon" = EXCLUDED."coupon",
                      "used_time" = customer_coupon_use.used_time + 1,
                      "updated_at" = CURRENT_TIMESTAMP;
      END IF;
      RETURN NEW;
    END;
    $$;`
  );

  await execute(
    connection,
    'DROP TRIGGER IF EXISTS "TRIGGER_TRACK_CUSTOMER_COUPON_USE" ON "order"'
  );

  await execute(
    connection,
    `CREATE TRIGGER "TRIGGER_TRACK_CUSTOMER_COUPON_USE"
      AFTER INSERT OR UPDATE OF payment_status ON "order"
      FOR EACH ROW
      EXECUTE PROCEDURE track_customer_coupon_use();`
  );
};
