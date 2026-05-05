"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// ===============================
// 🔐 FILE LINK COMPONENT (SECURE FINAL)
// ===============================

function FileLink({
  path,
  label,
  type,
  shipmentId,
}: {
  path?: string | null;
  label: string;
  type: string;
  shipmentId: number;
}) {
  const [loading, setLoading] = useState(false);

  const openFile = async () => {
    if (!shipmentId || !type || !path || loading) return;

    setLoading(true);
    const fileWindow = window.open("about:blank", "_blank");
    if (fileWindow) {
      fileWindow.opener = null;
      fileWindow.document.write("Loading...");
    }

    try {
      const res = await fetch(
        `/api/files/get?shipment_id=${shipmentId}&type=${type}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = await res.json();

      if (result.success && result.url) {
        if (fileWindow) {
          fileWindow.location.href = result.url;
        } else {
          window.open(result.url, "_blank", "noopener,noreferrer");
        }
      } else {
        fileWindow?.close();
        alert(result.error || "File unavailable");
      }
    } catch (e) {
      console.error("File fetch error:", e);
      fileWindow?.close();
      alert("File unavailable");
    } finally {
      setLoading(false);
    }
  };

  if (!path) return <p>No File Uploaded</p>;

  return (
    <button type="button" onClick={openFile} disabled={loading}>
      {loading ? "Loading..." : label}
    </button>
  );
}

// ===============================
// MAIN
// ===============================
function AdminReviewInner() {
  const searchParams = useSearchParams();
  const bl = searchParams.get("bl");

  const [data, setData] = useState<any>(null);

  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [finalFile, setFinalFile] = useState<File | null>(null);
  const [gateFile, setGateFile] = useState<File | null>(null);

  const [adminComment, setAdminComment] = useState("");

  const [paymentLink, setPaymentLink] = useState("");
  const [paymentMsg, setPaymentMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // ===============================
  // FETCH (SECURE + NO CACHE)
  // ===============================
  const fetchData = async () => {
    if (!bl) return;

    try {
      const terminal = localStorage.getItem("terminal");

      const res = await fetch(
        `/api/search-bl?bl=${bl}&terminal=${terminal}`,
        {
          credentials: "include",
          cache: "no-store", // 🔥 prevent stale
        }
      );

      const result = await res.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [bl]);

  if (!data) return <div style={{ padding: 40 }}>Loading...</div>;

  const canUploadDraft = data.pdf_status === "APPROVED" && !data.draft_invoice_filename;
  const canSendPaymentLink = !!data.draft_invoice_filename;
  const canUploadFinal = !!data.payment_proof_filename && !data.final_invoice_filename;
  const canUploadGate = !!data.final_invoice_filename && !data.gate_pass_filename;

  // ===============================
  // UPLOAD (SAFE)
  // ===============================
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
        credentials: "include",
      });

      const result = await res.json();

      if (result.success) {
        reset();
        await fetchData(); // 🔥 force refresh
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error(err);
      alert("Upload error");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // STATUS UPDATE
  // ===============================
  const updateStatus = async (status: string) => {
    if (!bl) return;

    setLoading(true);

    try {
      const res = await fetch("/api/review-bl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bl,
          status,
          comment: adminComment,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setAdminComment("");
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // PAYMENT LINK
  // ===============================
  const sendPaymentLink = async () => {
    const cleanPaymentLink = paymentLink.trim();

    if (!cleanPaymentLink) {
      setPaymentMsg("Please enter a payment link");
      return;
    }

    setLoading(true);
    setPaymentMsg(null);

    try {
      const res = await fetch("/api/set-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bl,
          payment_link: cleanPaymentLink,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setPaymentMsg("Sent ✅");
        setPaymentLink("");
        await fetchData();
      } else {
        setPaymentMsg(result.error || "Failed to send payment link");
      }
    } catch (err) {
      console.error(err);
      setPaymentMsg("Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-bg">
      <div className="card admin-card">
        <h2>Review BL: {data.bl_number}</h2>

        <p><strong>Consignee:</strong> {data.consignee}</p>
        <p><strong>Terminal:</strong> {data.terminal}</p>
        <p><strong>Status:</strong> {data.pdf_status}</p>

        <div className="admin-grid">

          <div className="mini-card">
            <h4>Uploaded Import Documents</h4>
            <FileLink path={data.pdf_filename} label="View Uploaded Documents" type="pdf" shipmentId={data.id} />
          </div>

          <div className="mini-card">
            <h4>Proof of Payment</h4>
            <FileLink path={data.payment_proof_filename} label="View Proof of Payment" type="payment" shipmentId={data.id} />
          </div>

          <div className="mini-card">
            <h4>Draft Invoice</h4>
            <FileLink path={data.draft_invoice_filename} label="View Draft Invoice" type="draft" shipmentId={data.id} />

            <input disabled={!canUploadDraft} type="file" onChange={(e) => setDraftFile(e.target.files?.[0] || null)} />
            <button disabled={!canUploadDraft} onClick={() => handleUpload(draftFile, "/api/upload-draft-invoice", () => setDraftFile(null))}>
              Upload Draft
            </button>

            <input
              disabled={!canSendPaymentLink}
              placeholder="Payment link"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
            />

            <button disabled={!canSendPaymentLink} onClick={sendPaymentLink}>
              Send Payment Link
            </button>

            {paymentMsg && <p>{paymentMsg}</p>}
          </div>

          <div className="mini-card">
            <h4>Final Invoice</h4>
            <FileLink path={data.final_invoice_filename} label="View Final Invoice" type="final" shipmentId={data.id} />

            <input disabled={!canUploadFinal} type="file" onChange={(e) => setFinalFile(e.target.files?.[0] || null)} />
            <button disabled={!canUploadFinal} onClick={() => handleUpload(finalFile, "/api/upload-final-invoice", () => setFinalFile(null))}>
              Upload Final
            </button>
          </div>

          <div className="mini-card">
            <h4>Gate Slip</h4>
            <FileLink path={data.gate_pass_filename} label="View Gate Slip" type="gate" shipmentId={data.id} />

            <input disabled={!canUploadGate} type="file" onChange={(e) => setGateFile(e.target.files?.[0] || null)} />
            <button disabled={!canUploadGate} onClick={() => handleUpload(gateFile, "/api/upload-gate-slip", () => setGateFile(null))}>
              Upload Gate
            </button>
          </div>

        </div>

        <button onClick={() => updateStatus("APPROVED")}>
          Approve
        </button>

        <textarea
          placeholder="Write comment..."
          value={adminComment}
          onChange={(e) => setAdminComment(e.target.value)}
        />

        <button onClick={() => updateStatus("NEED MORE DOCS")}>
          Need More Docs
        </button>

      </div>
    </div>
  );
}

// ===============================
export default function AdminReviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading...</div>}>
      <AdminReviewInner />
    </Suspense>
  );
}
