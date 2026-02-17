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

  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!bl) return;

    try {
      const res = await fetch(`/api/search-bl?bl=${bl}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [bl]);

  if (!data) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  const handleUpload = async (
    file: File | null,
    endpoint: string,
    reset: () => void
  ) => {
    if (!file || !bl) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bl", bl);

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        reset();
        fetchData();
      } else {
        alert(result.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Server error during upload");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!bl) return;

    setLoading(true);

    try {
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
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderLink = (url?: string | null, label?: string) => {
    if (!url || !url.startsWith("http")) {
      return <p>No File Uploaded</p>;
    }

    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
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
            {renderLink(data.pdf_filename, "View Uploaded Documents")}
          </div>

          <div className="mini-card">
            <h4>Proof of Payment</h4>
            {renderLink(data.payment_proof_filename, "View Proof of Payment")}
          </div>

          <div className="mini-card">
            <h4>Draft Invoice</h4>
            {renderLink(data.draft_invoice_filename, "View Draft Invoice")}
            <input
              type="file"
              accept=".pdf"
              onChange={(e) =>
                setDraftFile(e.target.files?.[0] || null)
              }
            />
            <button
              disabled={loading}
              onClick={() =>
                handleUpload(
                  draftFile,
                  "/api/upload-draft-invoice",
                  () => setDraftFile(null)
                )
              }
            >
              Upload / Replace Draft
            </button>
          </div>

          <div className="mini-card">
            <h4>Final Invoice</h4>
            {renderLink(data.final_invoice_filename, "View Final Invoice")}
            <input
              type="file"
              accept=".pdf"
              onChange={(e) =>
                setFinalFile(e.target.files?.[0] || null)
              }
            />
            <button
              disabled={loading}
              onClick={() =>
                handleUpload(
                  finalFile,
                  "/api/upload-final-invoice",
                  () => setFinalFile(null)
                )
              }
            >
              Upload Final Invoice
            </button>
          </div>

          <div className="mini-card">
            <h4>Gate Slip</h4>
            {renderLink(data.gate_pass_filename, "View Gate Slip")}
            <input
              type="file"
              accept=".pdf"
              onChange={(e) =>
                setGateFile(e.target.files?.[0] || null)
              }
            />
            <button
              disabled={loading}
              onClick={() =>
                handleUpload(
                  gateFile,
                  "/api/upload-gate-slip",
                  () => setGateFile(null)
                )
              }
            >
              Upload Gate Slip
            </button>
          </div>

        </div>

        <div style={{ marginTop: 30 }}>
          <button disabled={loading} onClick={() => updateStatus("APPROVED")}>
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
              disabled={loading}
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
