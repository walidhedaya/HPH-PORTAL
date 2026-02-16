"use client";

import { useState, useEffect } from "react";

type Shipment = {
  id: number;
  bl_number: string;
  tax_id: string;
  terminal: string;
  consignee: string;
  pdf_status: string | null;
  admin_comment?: string | null;
  pdf_filename?: string | null;
  draft_invoice_filename?: string | null;
  final_invoice_filename?: string | null;
  payment_proof_filename?: string | null;
  gate_pass_filename?: string | null;
};

const translations = {
  en: {
    title: "Import – Search BL",
    search: "Search",
    uploadPDF: "Upload Documents",
    draft: "Download Draft Invoice",
    uploadPayment: "Upload Payment Proof",
    final: "Download Final Invoice",
    gate: "Download Gate Slip",
    appointment: "Book Appointment",
    required: "Required Documents",
    remark: "Remark: upload PDF only",
    docs:
      "Delivery Order - Shipping Line Release Letter - Stamped Bill of Lading",
    notFound: "BL not found for selected terminal",
    underReview: "Documents Under Review",
    approved: "Documents Approved",
    needMore: "More Documents Required",
  },
  ar: {
    title: "الوارد – البحث عن بوليصة",
    search: "بحث",
    uploadPDF: "رفع المستندات",
    draft: "تحميل الفاتورة المبدئية",
    uploadPayment: "رفع إثبات الدفع",
    final: "تحميل الفاتورة النهائية",
    gate: "تحميل إذن الخروج",
    appointment: "حجز موعد",
    required: "المستندات المطلوبة",
    remark: "ملاحظة: يتم رفع ملفات PDF فقط",
    docs:
      "إذن التسليم - خطاب الإفراج من الخط الملاحي - بوليصة الشحن مختومة",
    notFound: "البوليصة غير موجودة في المحطة المختارة",
    underReview: "المستندات قيد المراجعة",
    approved: "تم اعتماد المستندات",
    needMore: "مطلوب مستندات إضافية",
  },
};

export default function ImportPage() {
  const [bl, setBl] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [lang, setLang] = useState<"en" | "ar">("en");

  useEffect(() => {
    const savedLang =
      typeof window !== "undefined"
        ? localStorage.getItem("lang")
        : "en";

    if (savedLang === "ar") setLang("ar");
  }, []);

  const t = translations[lang];

  const terminal =
    typeof window !== "undefined"
      ? localStorage.getItem("terminal")
      : null;

  async function searchBL() {
    setMessage("");
    setShipment(null);

    const res = await fetch(
      `/api/search-bl?bl=${bl}&terminal=${terminal}`
    );

    const data = await res.json();

    if (!data.success) {
      setMessage(t.notFound);
      return;
    }

    setShipment(data.data);
  }

  async function uploadPDF() {
    if (!pdfFile || !bl) return;

    const formData = new FormData();
    formData.append("file", pdfFile);
    formData.append("bl", bl);

    const res = await fetch("/api/upload-pdf", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.success) {
      setPdfFile(null);
      await searchBL();
    }
  }

  async function uploadPaymentProof() {
    if (!paymentFile || !bl) return;

    const formData = new FormData();
    formData.append("file", paymentFile);
    formData.append("bl", bl);

    const res = await fetch("/api/upload-payment-proof", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.success) {
      setPaymentFile(null);
      await searchBL();
    }
  }

  function btnClass(active: boolean) {
    return active ? "btn-active" : "btn-disabled";
  }

  function showRequiredCard() {
    if (!shipment) return false;

    return (
      !shipment.pdf_filename ||
      shipment.pdf_status === "NEED MORE DOCS"
    );
  }

  return (
    <div className="page-bg">

      <div className="lang-switch">
        <button
          className={lang === "en" ? "active" : ""}
          onClick={() => {
            setLang("en");
            localStorage.setItem("lang", "en");
          }}
        >
          EN
        </button>
        <button
          className={lang === "ar" ? "active" : ""}
          onClick={() => {
            setLang("ar");
            localStorage.setItem("lang", "ar");
          }}
        >
          AR
        </button>
      </div>

      <div className="card admin-card" dir={lang === "ar" ? "rtl" : "ltr"}>
        <h2>{t.title}</h2>

        <input
          placeholder="BL Number"
          value={bl}
          onChange={(e) => setBl(e.target.value)}
        />

        <button style={{ marginBottom: 20 }} onClick={searchBL}>
          {t.search}
        </button>

        {shipment && showRequiredCard() && (
          <div className="mini-card" style={{ marginBottom: 20 }}>
            <h4>{t.required}</h4>
            <p>{t.docs}</p>
            <p style={{ color: "#c0392b", marginTop: 10 }}>
              {t.remark}
            </p>

            {shipment.pdf_status === "UNDER REVIEW" && (
              <p style={{ color: "#b58900", marginTop: 15 }}>
                🕒 {t.underReview}
              </p>
            )}

            {shipment.pdf_status === "NEED MORE DOCS" && (
              <>
                <p style={{ color: "#c0392b", marginTop: 15 }}>
                  ❗ {t.needMore}
                </p>
                {shipment.admin_comment && (
                  <p style={{ marginTop: 8 }}>
                    <strong>Admin:</strong>{" "}
                    {shipment.admin_comment}
                  </p>
                )}
              </>
            )}

            {shipment.pdf_status === "APPROVED" && (
              <p style={{ color: "green", marginTop: 15 }}>
                ✔ {t.approved}
              </p>
            )}
          </div>
        )}

        {shipment && (
          <div className="admin-grid">

            {/* Upload Docs */}
            <div className="mini-card">
              <h4>{t.uploadPDF}</h4>
              <input
                type="file"
                accept="application/pdf"
                disabled={shipment.pdf_status === "UNDER REVIEW"}
                onChange={(e) =>
                  setPdfFile(e.target.files?.[0] || null)
                }
              />
              <button
                className={btnClass(
                  shipment.pdf_status !== "UNDER REVIEW"
                )}
                disabled={shipment.pdf_status === "UNDER REVIEW"}
                onClick={uploadPDF}
              >
                {t.uploadPDF}
              </button>
            </div>

            {/* Draft */}
            <div className="mini-card">
              <h4>{t.draft}</h4>
              <button
                className={btnClass(!!shipment.draft_invoice_filename)}
                disabled={!shipment.draft_invoice_filename}
                onClick={() =>
                  window.open(
                    `/uploads/draft/${shipment.draft_invoice_filename}`,
                    "_blank"
                  )
                }
              >
                {t.draft}
              </button>
            </div>

            {/* Payment */}
            <div className="mini-card">
              <h4>{t.uploadPayment}</h4>
              <input
                type="file"
                accept="application/pdf"
                disabled={!shipment.draft_invoice_filename}
                onChange={(e) =>
                  setPaymentFile(e.target.files?.[0] || null)
                }
              />
              <button
                className={btnClass(!!shipment.draft_invoice_filename)}
                disabled={!shipment.draft_invoice_filename}
                onClick={uploadPaymentProof}
              >
                {t.uploadPayment}
              </button>
            </div>

            {/* Final */}
            <div className="mini-card">
              <h4>{t.final}</h4>
              <button
                className={btnClass(!!shipment.final_invoice_filename)}
                disabled={!shipment.final_invoice_filename}
                onClick={() =>
                  window.open(
                    `/uploads/final/${shipment.final_invoice_filename}`,
                    "_blank"
                  )
                }
              >
                {t.final}
              </button>
            </div>

            {/* Gate */}
            <div className="mini-card">
              <h4>{t.gate}</h4>
              <button
                className={btnClass(!!shipment.gate_pass_filename)}
                disabled={!shipment.gate_pass_filename}
                onClick={() =>
                  window.open(
                    `/uploads/gates/${shipment.gate_pass_filename}`,
                    "_blank"
                  )
                }
              >
                {t.gate}
              </button>
            </div>

            {/* Appointment */}
            <div className="mini-card">
              <h4>{t.appointment}</h4>
              <button
                className={btnClass(!!shipment.gate_pass_filename)}
                disabled={!shipment.gate_pass_filename}
                onClick={() =>
                  window.open("https://appointment-link.com", "_blank")
                }
              >
                {t.appointment}
              </button>
            </div>

          </div>
        )}

        {message && <p style={{ marginTop: 15 }}>{message}</p>}
      </div>
    </div>
  );
}
