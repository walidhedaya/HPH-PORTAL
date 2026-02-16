"use client";

import { useEffect, useState } from "react";

type ExportShipment = {
  id: number;
  booking_number: string;
  stuffing: number;
  inspection: number;
  inspection_containers: number;
  export_docs_filename?: string | null;
  draft_invoice_filename?: string | null;
  payment_proof_filename?: string | null;
  final_invoice_filename?: string | null;
  gate_pass_filename?: string | null;
};

export default function ExportEntryPage() {
  const [booking, setBooking] = useState("");
  const [started, setStarted] = useState(false);
  const [shipment, setShipment] = useState<ExportShipment | null>(null);
  const [docsFile, setDocsFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [stuffing, setStuffing] = useState(false);
  const [inspection, setInspection] = useState(false);
  const [containers, setContainers] = useState("");

  function btnClass(active: boolean, done: boolean) {
    if (done) return "btn-done";
    return active ? "btn-active" : "btn-disabled";
  }

  async function startProcess() {
    if (!booking) return;

    const terminal = localStorage.getItem("terminal");
    const tax_id = localStorage.getItem("tax_id");

    const res = await fetch("/api/export-create-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_number: booking,
        terminal,
        tax_id,
      }),
    });

    const data = await res.json();

    if (data.success) {
      setShipment(data.data);
      setStarted(true);
    }
  }

  async function uploadExportDocs() {
    if (!docsFile || !shipment) return;

    const formData = new FormData();
    formData.append("file", docsFile);
    formData.append("booking_number", shipment.booking_number);
    formData.append("stuffing", stuffing ? "1" : "0");
    formData.append("inspection", inspection ? "1" : "0");
    formData.append("inspection_containers", containers || "0");

    const res = await fetch("/api/export-upload-docs", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.success) {
      setShipment(data.data);
      setDocsFile(null);
    }
  }

  async function uploadPayment() {
    if (!paymentFile || !shipment) return;

    const formData = new FormData();
    formData.append("file", paymentFile);
    formData.append("booking_number", shipment.booking_number);

    const res = await fetch("/api/export-upload-payment", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.success) {
      setShipment(data.data);
      setPaymentFile(null);
    }
  }

  return (
    <div className="page-bg">
      <div className="card admin-card">
        <h2>Export Entry</h2>

        {!started && (
          <>
            <input
              placeholder="Booking Number"
              value={booking}
              onChange={(e) => setBooking(e.target.value)}
            />
            <button style={{ marginBottom: 20 }} onClick={startProcess}>
              Continue
            </button>
          </>
        )}

        {started && shipment && (
          <div className="admin-grid">

            {/* Export Docs */}
            <div className="mini-card">
              <h4>Export Documents</h4>

              <label>
                <input
                  type="checkbox"
                  checked={stuffing}
                  onChange={(e) => setStuffing(e.target.checked)}
                /> Stuffing
              </label>

              <br />

              <label>
                <input
                  type="checkbox"
                  checked={inspection}
                  onChange={(e) => setInspection(e.target.checked)}
                /> Inspection
              </label>

              {inspection && (
                <input
                  type="number"
                  placeholder="Containers"
                  value={containers}
                  onChange={(e) => setContainers(e.target.value)}
                />
              )}

              <input
                type="file"
                disabled={!!shipment.export_docs_filename}
                onChange={(e) =>
                  setDocsFile(e.target.files?.[0] || null)
                }
              />

              <button
                className={btnClass(true, !!shipment.export_docs_filename)}
                disabled={!!shipment.export_docs_filename}
                onClick={uploadExportDocs}
              >
                {shipment.export_docs_filename
                  ? "Documents Uploaded"
                  : "Upload Documents"}
              </button>
            </div>

            {/* Draft */}
            <div className="mini-card">
              <h4>Draft Invoice</h4>
              <button
                className={btnClass(
                  !!shipment.export_docs_filename,
                  !!shipment.draft_invoice_filename
                )}
                disabled={!shipment.draft_invoice_filename}
                onClick={() =>
                  window.open(
                    `/uploads/export-draft/${shipment.draft_invoice_filename}`,
                    "_blank"
                  )
                }
              >
                {shipment.draft_invoice_filename
                  ? "Draft Downloaded"
                  : "Download Draft"}
              </button>
            </div>

            {/* Payment */}
            <div className="mini-card">
              <h4>Payment Proof</h4>
              <input
                type="file"
                disabled={
                  !shipment.draft_invoice_filename ||
                  !!shipment.payment_proof_filename
                }
                onChange={(e) =>
                  setPaymentFile(e.target.files?.[0] || null)
                }
              />
              <button
                className={btnClass(
                  !!shipment.draft_invoice_filename,
                  !!shipment.payment_proof_filename
                )}
                disabled={
                  !shipment.draft_invoice_filename ||
                  !!shipment.payment_proof_filename
                }
                onClick={uploadPayment}
              >
                {shipment.payment_proof_filename
                  ? "Payment Uploaded"
                  : "Upload Payment"}
              </button>
            </div>

            {/* Final */}
            <div className="mini-card">
              <h4>Final Invoice</h4>
              <button
                className={btnClass(
                  !!shipment.payment_proof_filename,
                  !!shipment.final_invoice_filename
                )}
                disabled={!shipment.final_invoice_filename}
                onClick={() =>
                  window.open(
                    `/uploads/export-final/${shipment.final_invoice_filename}`,
                    "_blank"
                  )
                }
              >
                {shipment.final_invoice_filename
                  ? "Final Downloaded"
                  : "Download Final"}
              </button>
            </div>

            {/* Gate */}
            <div className="mini-card">
              <h4>Gate Slips</h4>
              <button
                className={btnClass(
                  !!shipment.final_invoice_filename,
                  !!shipment.gate_pass_filename
                )}
                disabled={!shipment.gate_pass_filename}
                onClick={() =>
                  window.open(
                    `/uploads/export-gates/${shipment.gate_pass_filename}`,
                    "_blank"
                  )
                }
              >
                {shipment.gate_pass_filename
                  ? "Gate Downloaded"
                  : "Download Gate"}
              </button>
            </div>

            {/* Appointment */}
            <div className="mini-card">
              <h4>Appointment</h4>
              <button
                className={btnClass(
                  !!shipment.gate_pass_filename,
                  !!shipment.gate_pass_filename
                )}
                disabled={!shipment.gate_pass_filename}
                onClick={() =>
                  window.open(
                    "https://play.google.com/store/apps/details?id=com.hph.odt.stacks",
                    "_blank"
                  )
                }
              >
                {shipment.gate_pass_filename
                  ? "Book Appointment"
                  : "Appointment Locked"}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
