"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type QueueItem = {
  bl_number: string;
  terminal: string;
  stage: string;
  timestamp: string;
  handling_admin: string;
};

export default function AdminImportPage() {
  const router = useRouter();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [search, setSearch] = useState("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  const [terminal, setTerminal] = useState<string | null>(null);

  // TEMP UI GUARD (real protection = middleware)
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole !== "admin" && storedRole !== "super_admin") {
      router.push("/login");
      return;
    }

    setTerminal(localStorage.getItem("terminal"));
  }, [router]);

  // Load Queue
  useEffect(() => {
    if (!terminal) return;

    fetch(`/api/admin-queue?terminal=${terminal}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setQueue(data.data);
      });
  }, [terminal]);

  // SEARCH (secure)
  const handleSearch = async () => {
    setSearchMsg(null);

    if (!search.trim()) {
      setSearchMsg("Please enter BL number");
      return;
    }

    try {
      const res = await fetch(
        `/api/search-bl?bl=${search.trim()}&terminal=${terminal}`
      );

      const data = await res.json();

      if (data.success && data.data) {
        router.push(`/admin/review?bl=${data.data.bl_number}`);
      } else {
        setSearchMsg("BL not found or unauthorized");
      }
    } catch {
      setSearchMsg("Server error");
    }
  };

  // UPLOAD
  const handleExcelUpload = async () => {
    if (!excelFile) {
      setMessage("Please select an Excel file");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", excelFile);

      const res = await fetch("/api/upload-bl", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Upload failed");
        return;
      }

      setMessage("Excel uploaded successfully");
      setExcelFile(null);

      if (terminal) {
        const qRes = await fetch(`/api/admin-queue?terminal=${terminal}`);
        const qData = await qRes.json();
        if (qData.success) setQueue(qData.data);
      }

    } catch {
      setMessage("Server error during upload");
    } finally {
      setLoading(false);
    }
  };

  // LOGOUT
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      localStorage.clear();
      window.location.href = "/login";
    } catch {
      alert("Logout failed");
    }
  };

  return (
    <div className="page-bg">
      <div className="card admin-card">

        {/* 🔴 LOGOUT BUTTON */}
        <button
          onClick={handleLogout}
          style={{
            marginBottom: "20px",
            background: "#d9534f",
            color: "white",
            padding: "8px 12px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Logout
        </button>

        <h2 style={{ marginBottom: "25px" }}>
          Admin Control Panel
        </h2>

        <div className="admin-grid">

          <div className="mini-card">
            <h4>Upload BL Excel</h4>
            <input
              type="file"
              accept=".xlsx"
              onChange={e => setExcelFile(e.target.files?.[0] || null)}
            />
            <button onClick={handleExcelUpload}>
              {loading ? "Uploading..." : "Upload Excel"}
            </button>
            {message && <p>{message}</p>}
          </div>

          <div className="mini-card">
            <h4>Search BL</h4>
            <input
              placeholder="Enter BL Number"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button onClick={handleSearch}>
              Search
            </button>
            {searchMsg && <p style={{ color: "red" }}>{searchMsg}</p>}
          </div>

          <div className="mini-card">
            <h4>Users Control</h4>
            <button onClick={() => router.push("/admin/users-control")}>
              Start
            </button>
          </div>

        </div>

        <div style={{ marginTop: "40px" }}>
          <h3>Processing Queue ({terminal || "-"})</h3>

          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>BL</th>
                <th>Stage</th>
                <th>Date</th>
                <th>Admin</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item, i) => (
                <tr key={i}>
                  <td
                    style={{ cursor: "pointer", color: "blue" }}
                    onClick={() =>
                      router.push(`/admin/review?bl=${item.bl_number}`)
                    }
                  >
                    {item.bl_number}
                  </td>
                  <td>{item.stage}</td>
                  <td>
                    {item.timestamp
                      ? new Date(item.timestamp).toLocaleString()
                      : "-"}
                  </td>
                  <td>{item.handling_admin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
