import db from "@/lib/db";

let initialized = false;

export async function ensurePaymentColumn() {
  if (initialized) return;

  try {
    await db.query(`
      ALTER TABLE shipments
      ADD COLUMN payment_link TEXT
    `);

    initialized = true;
    console.log("Column created ✅");
  } catch (err: any) {
    // لو العمود موجود ignore
    if (!err.message.includes("duplicate")) {
      console.error(err);
    }
  }
}