"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function AdminReviewInner() {
  const searchParams = useSearchParams();
  const bl = searchParams.get("bl");

  const [data, setData] = useState<any>(null);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [finalFile, setFinalFile] = useState<File | null>(null);
  const [gateFile, setGateFile] = useState<File | null>(null);
  const [adminComment, setAdminComment] = useState("");

  const fetchData = () => {
    if (!bl) return;

    fetch(`/api/search-bl?bl=${bl}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data);
        }
      });
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

        {/* باقي JSX بتاعك زي ما هو بالظبط */}
        
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
