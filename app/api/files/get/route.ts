import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase";

const SECRET = process.env.JWT_SECRET as string;

// ===============================
// 🔥 NORMALIZE PATH (SAFE)
// ===============================
function normalizePath(path: string) {
  if (!path) return path;

  // لو URL قديم → نحوله لمسار
  if (path.startsWith("http")) {
    const match = path.match(/\/documents\/(.+)/);
    if (match && match[1]) {
      return match[1];
    }
  }

  // إزالة أي / في البداية
  path = path.replace(/^\/+/, "");

  return path;
}

export async function GET(req: NextRequest) {
  try {
    // ===============================
    // 🔐 ENV CHECK
    // ===============================
    if (!SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    // ===============================
    // 🔐 AUTH
    // ===============================
    const token = req.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user: any;

    try {
      user = jwt.verify(token, SECRET);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // ===============================
    // 📥 PARAMS
    // ===============================
    const { searchParams } = new URL(req.url);

    const shipmentIdRaw = searchParams.get("shipment_id");
    const type = searchParams.get("type");

    if (!shipmentIdRaw || !type) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const shipmentId = Number(shipmentIdRaw);

    if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
      return NextResponse.json({ error: "Invalid shipment_id" }, { status: 400 });
    }

    const allowedTypes = ["pdf", "draft", "final", "payment", "gate", "export_docs"];

    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // ===============================
    // 📦 GET SHIPMENT (EXPORT FIRST, THEN IMPORT)
    // ===============================
    let shipment: any = null;
    let isExport = false;

    // Try export_shipments first
    const exportResult = await db.query(
      `
      SELECT 
        id,
        tax_id,
        export_docs_filename,
        draft_invoice_filename,
        final_invoice_filename,
        payment_proof_filename,
        gate_pass_filename
      FROM export_shipments
      WHERE id = $1
      `,
      [shipmentId]
    );

    if (exportResult.rows.length > 0) {
      shipment = exportResult.rows[0];
      isExport = true;
    } else {
      // Fall back to import shipments
      const importResult = await db.query(
        `
        SELECT 
          id,
          tax_id,
          pdf_filename,
          draft_invoice_filename,
          final_invoice_filename,
          payment_proof_filename,
          gate_pass_filename
        FROM shipments
        WHERE id = $1
        `,
        [shipmentId]
      );

      if (importResult.rows.length > 0) {
        shipment = importResult.rows[0];
        isExport = false;
      }
    }

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    // ===============================
    // 🔐 ACCESS CONTROL
    // ===============================
    let allowed = false;

    if (user.role === "admin" || user.role === "super_admin" || user.full_access) {
      allowed = true;
    } else {
      const access = await db.query(
        `
        SELECT 1 
        FROM user_tax_access
        WHERE user_id = $1
        AND LOWER(tax_id) = LOWER($2)
        LIMIT 1
        `,
        [user.id, shipment.tax_id]
      );

      if (access.rowCount && access.rowCount > 0) {
        allowed = true;
      }
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ===============================
    // 📁 FILE MAP
    // ===============================
    let fileMap: Record<string, string | null>;
    let folderMap: Record<string, string>;

    if (isExport) {
      fileMap = {
        export_docs: shipment.export_docs_filename,
        draft: shipment.draft_invoice_filename,
        final: shipment.final_invoice_filename,
        payment: shipment.payment_proof_filename,
        gate: shipment.gate_pass_filename,
        pdf: null, // Not available for exports
      };

      folderMap = {
        export_docs: "export-documents/",
        draft: "export-draft/",
        final: "export-final/",
        payment: "export-payments/",
        gate: "export-gates/",
        pdf: "pdf/",
      };
    } else {
      fileMap = {
        pdf: shipment.pdf_filename,
        draft: shipment.draft_invoice_filename,
        final: shipment.final_invoice_filename,
        payment: shipment.payment_proof_filename,
        gate: shipment.gate_pass_filename,
        export_docs: null, // Not available for imports
      };

      folderMap = {
        pdf: "pdf/",
        draft: "draft/",
        final: "final/",
        payment: "payment/",
        gate: "gate/",
        export_docs: "export-documents/",
      };
    }

    let filePath = fileMap[type];

    if (!filePath) {
      return NextResponse.json({ error: "File not available" }, { status: 404 });
    }

    // ===============================
    // 🔥 NORMALIZE PATH
    // ===============================
    filePath = normalizePath(filePath);

    // 🚫 SECURITY CHECK
    if (
      filePath.includes("..") ||
      filePath.includes("\\") ||
      !filePath.startsWith(folderMap[type])
    ) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // ===============================
    // 🔐 SIGNED URL (USING SERVICE ROLE)
    // ===============================
    const { data, error } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(filePath, 300); // 5 minutes

    if (error || !data?.signedUrl) {
      console.error("SIGNED URL ERROR:", error);

      return NextResponse.json(
        { error: "Failed to generate file URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: data.signedUrl,
    });

  } catch (error) {
    console.error("FILE GET ERROR:", error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
