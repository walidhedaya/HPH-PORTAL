"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ExportShipment = {
  id: number;
  booking_number: string;
  terminal: string;
  tax_id: string;
  stuffing: number;
  inspection: number;
  inspection_containers: number;
  export_docs_filename?: string | null;
  draft_invoice_filename?: string | null;
  payment_proof_filename?: string | null;
  final_invoice_filename?: string | null;
  gate_pass_filename?: string | null;
  created_by_user_id?: number | null;
  created_by_username?: string | null;
  created_ip?: string | null;
  user_agent?: string | null;
};

export default function AdminExportDetailsPage() {
  const params = useParams();
  const booking = params.booking as string;

  const [shipment, setShipment] = useState<ExportShipment | null>(null);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [finalFile, setFinalFile] = useState<File | null>(null);
  const [gateFile, setGateFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const res = await fetch(`/api/admin/export-queue`);
    const data = await res.json();
    if (data.success) {
      const found = data.data.find(
        (item: any) => item.booking_number === booking
      );
      if (found) setShipment(found);
    }
  }

  function btnClass(active: boolean, done: boolean) {
    if (done) return "btn-done";
    return active ? "btn-active" : "btn-disabled";
  }

  async function downloadFile(fileType: "pdf" | "export_docs" | "draft" | "payment" | "final" | "gate") {
    if (!shipment) return;
    
    try {
      const res = await fetch(`/api/files/get?shipment_id=${shipment.id}&type=${fileType}`);
      const data = await res.json();
      
      if (data.success && data.url) {
        window.open(data.url, "_blank");
      } else {
        alert("Failed to download file");
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("Error downloading file");
    }
  }

  async function uploadDraft() {
    if (!draftFile) return;
    const formData = new FormData();
    formData.append("file", draftFile);
    formData.append("booking_number", booking);

    await fetch("/api/admin/export-upload-draft", {
      method: "POST",
      body: formData,
    });

    setDraftFile(null);
    fetchData();
  }

  async function uploadFinal() {
    if (!finalFile) return;
    const formData = new FormData();
    formData.append("file", finalFile);
    formData.append("booking_number", booking);

    await fetch("/api/admin/export-upload-final", {
      method: "POST",
      body: formData,
    });

    setFinalFile(null);
    fetchData();
  }

  async function uploadGate() {
    if (!gateFile) return;
    const formData = new FormData();
    formData.append("file", gateFile);
    formData.append("booking_number", booking);

    await fetch("/api/admin/export-upload-gate", {
      method: "POST",
      body: formData,
    });

    setGateFile(null);
    fetchData();
  }

  if (!shipment)
    return (
      <div className="page-bg">
        <div className="card">Loading...</div>
      </div>
    );

  return (
    <div className="page-bg">
      <div className="card admin-card">
        <h2>Export Booking: {shipment.booking_number}</h2>

        <p><strong>Terminal:</strong> {shipment.terminal}</p>
        <p><strong>Tax ID:</strong> {shipment.tax_id}</p>
        <p><strong>Created By:</strong> {shipment.created_by_username || shipment.created_by_user_id || "-"}</p>
        <p><strong>Created IP:</strong> {shipment.created_ip || "-"}</p>
        <p><strong>User Agent:</strong> {shipment.user_agent || "-"}</p>
        <p><strong>Stuffing:</strong> {shipment.stuffing ? "Yes" : "No"}</p>
        <p>
          <strong>Inspection:</strong>{" "}
          {shipment.inspection
            ? `Yes (${shipment.inspection_containers})`
            : "No"}
        </p>

        <div className="admin-grid" style={{ marginTop: 20 }}>

          {/* Export Docs */}
          <div className="mini-card">
            <h4>Export Documents</h4>
            <button
              className={btnClass(!!shipment.export_docs_filename, !!shipment.export_docs_filename)}
              disabled={!shipment.export_docs_filename}
              onClick={() => downloadFile("export_docs")}
            >
              {shipment.export_docs_filename
                ? "Download Documents"
                : "Download Documents"}
            </button>
          </div>

          {/* Draft */}
          <div className="mini-card">
            <h4>Draft Invoice</h4>
            <input
              type="file"
              disabled={!shipment.export_docs_filename || !!shipment.draft_invoice_filename}
              onChange={(e) =>
                setDraftFile(e.target.files?.[0] || null)
              }
            />
            <button
              className={btnClass(!!shipment.export_docs_filename, !!shipment.draft_invoice_filename)}
              disabled={!shipment.export_docs_filename || !!shipment.draft_invoice_filename}
              onClick={uploadDraft}
            >
              {shipment.draft_invoice_filename
                ? "Draft Uploaded"
                : "Upload Draft"}
            </button>

            {shipment.draft_invoice_filename && (
              <button
                style={{ marginTop: 10 }}
                onClick={() => downloadFile("draft")}
              >
                Download Draft
              </button>
            )}
          </div>

          {/* Payment */}
          <div className="mini-card">
            <h4>Payment Proof</h4>
            <button
              className={btnClass(!!shipment.payment_proof_filename, !!shipment.payment_proof_filename)}
              disabled={!shipment.payment_proof_filename}
              onClick={() => downloadFile("payment")}
            >
              {shipment.payment_proof_filename
                ? "Download Payment"
                : "Download Payment"}
            </button>
          </div>

          {/* Final */}
          <div className="mini-card">
            <h4>Final Invoice</h4>
            <input
              type="file"
              disabled={!shipment.payment_proof_filename || !!shipment.final_invoice_filename}
              onChange={(e) =>
                setFinalFile(e.target.files?.[0] || null)
              }
            />
            <button
              className={btnClass(!!shipment.payment_proof_filename, !!shipment.final_invoice_filename)}
              disabled={!shipment.payment_proof_filename || !!shipment.final_invoice_filename}
              onClick={uploadFinal}
            >
              {shipment.final_invoice_filename
                ? "Final Uploaded"
                : "Upload Final"}
            </button>

            {shipment.final_invoice_filename && (
              <button
                style={{ marginTop: 10 }}
                onClick={() => downloadFile("final")}
              >
                Download Final
              </button>
            )}
          </div>

          {/* Gate */}
          <div className="mini-card">
            <h4>Gate Slip</h4>
            <input
              type="file"
              disabled={!shipment.final_invoice_filename || !!shipment.gate_pass_filename}
              onChange={(e) =>
                setGateFile(e.target.files?.[0] || null)
              }
            />
            <button
              className={btnClass(!!shipment.final_invoice_filename, !!shipment.gate_pass_filename)}
              disabled={!shipment.final_invoice_filename || !!shipment.gate_pass_filename}
              onClick={uploadGate}
            >
              {shipment.gate_pass_filename
                ? "Gate Uploaded"
                : "Upload Gate"}
            </button>

            {shipment.gate_pass_filename && (
              <button
                style={{ marginTop: 10 }}
                onClick={() => downloadFile("gate")}
              >
                Download Gate
              </button>
            )}
          </div>

          {/* Appointment */}
          <div className="mini-card">
            <h4>Appointment</h4>
            <button
              className={btnClass(!!shipment.gate_pass_filename, !!shipment.gate_pass_filename)}
              disabled={!shipment.gate_pass_filename}
              onClick={() =>
                window.open(
                  "https://play.google.com/store/apps/details?id=com.hph.odt.stacks",
                  "_blank"
                )
              }
            >
              {shipment.gate_pass_filename
                ? "Appointment Available"
                : "Book Appointment"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
