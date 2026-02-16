"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function AdminReviewInner() {
  const searchParams = useSearchParams();
  const bl = searchParams.get("bl");

  const [data, setData] = useState<any>(null);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [finalFile, setFinalFile] = useState<File | null>(null);
  const [gateFile, setGateFile] = useState<File | null>(null);
  const [adminComment, setAdminComment] = useState("");

  const fetchData = async () => {
    if (!bl) return;

    const res = await fetch(`/api/search-bl?bl=${bl}`);
    const result = await res.json();

    if (result.success) {
      setData(result.data);
    }
  };

  useEffect(() => {
    fetchData();
  }, [bl]);

  if (!data) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  const uploadDraft = async () => {
    if (!draftFile || !bl) return;

    const formData = new FormData();
    formData.append("file", draftFile);
    formData.append("bl", bl);

    const res = await fetch("/api/upload-draft-invoice", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();

    if (result.success) {
      setDraftFile(null);
      fetchData();
    }
  };

  const uploadFinalInvoice = async () => {
    if (!finalFile || !bl) return;

    const formData = new FormData();
    formData.append("file", finalFile);
    formData.append("bl", bl);

    const res = await fetch("/api/upload-final-invoice", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();

    if (result.success) {
      setFinalFile(null);
      fetchData();
    }
  };

  const uploadGateSlip = async () => {
    if (!gateFile || !bl) return;

    const formData = new FormData();
    formData.append("file", gateFile);
    formData.append("bl", bl);

    const res = await fetch("/api/upload-gate-slip", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();

    if (result.success) {
      setGateFile(null);
      fetchData();
    }
  };

  const updateStatus = async (status: string) => {
    if (!bl) return;

    const res = await fetch("/api/review-bl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bl,
        status,
        comment: status === "NEED MORE DOCS" ? adminComment : null,
      }),
    });

    const result = await res.json();

    if (result.success) {
      setAdminComment("");
      fetchData();
    }
  };

  return (
    <div className="page-bg">
      <div className="card admin-card">

        <h2>Review BL: {data.bl_number}</h2>
        <p><strong>Consignee:</strong> {data.consignee}</p>
        <p><strong>Terminal:</strong> {data.terminal}</p>

        <p>
          <strong>Documents Status:</strong>{" "}
          {data.pdf_status || "No Documents Uploaded"}
        </p>

        <div className="admin-grid">

          <div className="mini-card">
            <h4>Uploaded Import Documents</h4>
            {data.pdf_filename ? (
              <a href={`/uploads/import-documents/${data.pdf_filename}`} target="_blank">
                View Uploaded Documents
              </a>
            ) : (
              <p>No Documents Uploaded</p>
            )}
          </div>

          <div className="mini-card">
            <h4>Proof of Payment</h4>
            {data.payment_proof_filename ? (
              <a href={`/uploads/payments/${data.payment_proof_filename}`} target="_blank">
                View Proof of Payment
              </a>
            ) : (
              <p>No Proof Uploaded</p>
            )}
          </div>

          <div className="mini-card">
            <h4>Draft Invoice</h4>
            {data.draft_invoice_filename ? (
              <>
                <a href={`/uploads/draft/${data.draft_invoice_filename}`} target="_blank">
                  View Draft Invoice
                </a>
                <input type="file" accept=".pdf"
                  onChange={(e) => setDraftFile(e.target.files?.[0] || null)}
                />
                <button onClick={uploadDraft}>Replace Draft</button>
              </>
            ) : (
              <>
                <input type="file" accept=".pdf"
                  onChange={(e) => setDraftFile(e.target.files?.[0] || null)}
                />
                <button onClick={uploadDraft}>Upload Draft</button>
              </>
            )}
          </div>

          <div className="mini-card">
            <h4>Final Invoice</h4>
            {data.final_invoice_filename ? (
              <a href={`/uploads/final/${data.final_invoice_filename}`} target="_blank">
                Review Final Invoice
              </a>
            ) : (
              <>
                <input type="file" accept=".pdf"
                  onChange={(e) => setFinalFile(e.target.files?.[0] || null)}
                />
                <button onClick={uploadFinalInvoice}>Upload Final Invoice</button>
              </>
            )}
          </div>

          <div className="mini-card">
            <h4>Gate Slip</h4>
            {data.gate_pass_filename ? (
              <a href={`/uploads/gates/${data.gate_pass_filename}`} target="_blank">
                View Gate Slip
              </a>
            ) : (
              <>
                <input type="file" accept=".pdf"
                  onChange={(e) => setGateFile(e.target.files?.[0] || null)}
                />
                <button onClick={uploadGateSlip}>Upload Gate Slip</button>
              </>
            )}
          </div>

        </div>

        <div style={{ marginTop: 30 }}>
          <button onClick={() => updateStatus("APPROVED")}>
            Approve
          </button>

          <div style={{ marginTop: 15 }}>
            <textarea
              placeholder="Write required documents or comments here..."
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                minHeight: 80,
                marginBottom: 10
              }}
            />

            <button
              style={{ background: "#d97706" }}
              onClick={() => updateStatus("NEED MORE DOCS")}
            >
              Need More Docs
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function AdminReviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading...</div>}>
      <AdminReviewInner />
    </Suspense>
  );
}
