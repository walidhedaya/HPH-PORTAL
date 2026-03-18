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
  payment_link?: string | null; // ✅ NEW
};

const translations = {
  en: {
    title: "Import – Search BL",
    search: "Search",
    uploadPDF: "Upload Documents",
    draft: "Download Draft Invoice",
    uploadPayment: "Upload Payment Proof",
    pay: "PAY", // ✅ NEW
    final: "Download Final Invoice",
    gate: "Download Gate Slip",
    appointment: "Book Appointment",
    required: "Required Documents",
    remark: "Remark: upload PDF only",
    docs:
      "Delivery Order - Shipping Line Release Letter - Stamped Bill of Lading - Final Customs Release",
    notFound: "BL not found for selected terminal",
    underReview: "Documents Under Review",
    approved:
      "Approved – Please wait for draft invoice",
    needMore: "More Documents Required",
  },
  ar: {
    title: "الوارد – البحث عن بوليصة",
    search: "بحث",
    uploadPDF: "رفع المستندات",
    draft: "تحميل الفاتورة المبدئية",
    uploadPayment: "رفع إثبات الدفع",
    pay: "الدفع", // ✅ NEW
    final: "تحميل الفاتورة النهائية",
    gate: "تحميل إذن الخروج",
    appointment: "حجز موعد",
    required: "المستندات المطلوبة",
    remark: "ملاحظة: يتم رفع ملفات PDF فقط",
    docs:
      "إذن التسليم - خطاب الإفراج من الخط الملاحي - بوليصة الشحن مختومة - الإفراج الجمركى النهائى",
    notFound: "البوليصة غير موجودة في المحطة المختارة",
    underReview: "المستندات قيد المراجعة",
    approved:
      "تم اعتماد المستندات – برجاء انتظار الفاتورة المبدئية",
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

  function openFile(url?: string | null) {
    if (!url) return;
    window.open(url, "_blank");
  }

  function openPayment() {
    if (!shipment?.payment_link) return;
    window.open(shipment.payment_link, "_blank");
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

        {shipment && (
          <>
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

            <div className="admin-grid">

              {/* Upload Documents */}
              <div className="mini-card">
                <h4>{t.uploadPDF}</h4>

                {shipment.pdf_filename ? (
                  <button className="btn-disabled" disabled>
                    Documents Uploaded ✔
                  </button>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) =>
                        setPdfFile(e.target.files?.[0] || null)
                      }
                    />
                    <button
                      className="btn-active"
                      onClick={uploadPDF}
                    >
                      {t.uploadPDF}
                    </button>
                  </>
                )}
              </div>

              {/* Draft */}
              <div className="mini-card">
                <h4>{t.draft}</h4>
                <button
                  className={btnClass(
                    !!shipment.draft_invoice_filename
                  )}
                  disabled={!shipment.draft_invoice_filename}
                  onClick={() =>
                    openFile(shipment.draft_invoice_filename)
                  }
                >
                  {shipment.draft_invoice_filename
                    ? t.draft
                    : "Waiting for Draft"}
                </button>

                {/* ✅ PAY BUTTON */}
                <button
                  style={{ marginTop: 10 }}
                  className={btnClass(
                    !!shipment.payment_link &&
                    !!shipment.draft_invoice_filename
                  )}
                  disabled={
                    !shipment.payment_link ||
                    !shipment.draft_invoice_filename
                  }
                  onClick={openPayment}
                >
                  {t.pay}
                </button>
              </div>

              {/* Payment Upload */}
              <div className="mini-card">
                <h4>{t.uploadPayment}</h4>

                {shipment.payment_proof_filename ? (
                  <button className="btn-disabled" disabled>
                    Payment Uploaded ✔
                  </button>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="application/pdf"
                      disabled={
                        !shipment.draft_invoice_filename
                      }
                      onChange={(e) =>
                        setPaymentFile(
                          e.target.files?.[0] || null
                        )
                      }
                    />
                    <button
                      className={btnClass(
                        !!shipment.draft_invoice_filename
                      )}
                      disabled={
                        !shipment.draft_invoice_filename
                      }
                      onClick={uploadPaymentProof}
                    >
                      {t.uploadPayment}
                    </button>
                  </>
                )}
              </div>

              {/* Final */}
              <div className="mini-card">
                <h4>{t.final}</h4>
                <button
                  className={btnClass(
                    !!shipment.final_invoice_filename
                  )}
                  disabled={!shipment.final_invoice_filename}
                  onClick={() =>
                    openFile(shipment.final_invoice_filename)
                  }
                >
                  {shipment.final_invoice_filename
                    ? t.final
                    : "Waiting for Final"}
                </button>
              </div>

              {/* Gate */}
              <div className="mini-card">
                <h4>{t.gate}</h4>
                <button
                  className={btnClass(
                    !!shipment.gate_pass_filename
                  )}
                  disabled={!shipment.gate_pass_filename}
                  onClick={() =>
                    openFile(shipment.gate_pass_filename)
                  }
                >
                  {shipment.gate_pass_filename
                    ? t.gate
                    : "Waiting for Gate"}
                </button>
              </div>

              {/* Appointment */}
              <div className="mini-card">
                <h4>{t.appointment}</h4>
                <button
                  className={btnClass(
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
                  {t.appointment}
                </button>
              </div>

            </div>
          </>
        )}

        {message && <p style={{ marginTop: 15 }}>{message}</p>}
      </div>
    </div>
  );
}