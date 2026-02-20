"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Shipment = {
  id: number;
  bl_number: string;
  tax_id: string;
  terminal: string;
  consignee: string;
  pdf_status?: string | null;
};

type QueueItem = {
  bl_number: string;
  terminal: string;
  stage: string;
  timestamp: string;
  handling_admin: string;
};

export default function AdminImportPage() {
  const router = useRouter();

  const [bls, setBls] = useState<Shipment[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [search, setSearch] = useState("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  const [taxId, setTaxId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [userMsg, setUserMsg] = useState<string | null>(null);

  const terminal =
    typeof window !== "undefined"
      ? localStorage.getItem("terminal")
      : null;

  // =====================
  // Load BLs
  // =====================
  useEffect(() => {
    fetch("/api/bls")
      .then(res => res.json())
      .then(data => {
        if (data.success) setBls(data.data);
      });
  }, []);

  // =====================
  // Load Queue
  // =====================
  useEffect(() => {
    if (!terminal) return;

    fetch(`/api/admin-queue?terminal=${terminal}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setQueue(data.data);
        }
      });
  }, [terminal]);

  // =====================
  // SEARCH FUNCTION
  // =====================
  const handleSearch = () => {
    setSearchMsg(null);

    if (!search.trim()) {
      setSearchMsg("Please enter BL number");
      return;
    }

    const found = bls.find(
      b => b.bl_number.toLowerCase() === search.trim().toLowerCase()
    );

    if (!found) {
      setSearchMsg("BL not found");
      return;
    }

    router.push(`/admin/review?bl=${found.bl_number}`);
  };

  // =====================
  // Upload Excel
  // =====================
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

      const blRes = await fetch("/api/bls");
      const blData = await blRes.json();
      if (blData.success) setBls(blData.data);

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

  // =====================
  // Create User
  // =====================
  const handleCreateUser = async () => {
    setUserMsg(null);

    if (!taxId || !password || !confirm) {
      setUserMsg("All fields are required");
      return;
    }

    if (password !== confirm) {
      setUserMsg("Passwords do not match");
      return;
    }

    const res = await fetch("/api/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tax_id: taxId.trim(),
        password,
        role,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setUserMsg(data.error || "Failed to create user");
      return;
    }

    setUserMsg("User created successfully");
    setTaxId("");
    setPassword("");
    setConfirm("");
    setRole("user");
  };

  return (
    <div className="page-bg">
      <div className="card admin-card">

        <h2 style={{ marginBottom: "25px" }}>
          Admin Control Panel
        </h2>

        <div className="admin-grid">

          {/* Upload BL */}
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
            {message && (
              <p style={{ marginTop: 10, fontSize: 14 }}>
                {message}
              </p>
            )}
          </div>

          {/* Search */}
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
            {searchMsg && (
              <p style={{ marginTop: 10, fontSize: 14, color: "red" }}>
                {searchMsg}
              </p>
            )}
          </div>

          {/* Create User */}
          <div className="mini-card">
            <h4>Create User</h4>

            <input
              placeholder="Tax ID"
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <input
              type="password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />

            {/* Role Selector */}
            <select
              value={role}
              onChange={e =>
                setRole(e.target.value as "admin" | "user")
              }
              style={{ marginBottom: "10px" }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>

            <button onClick={handleCreateUser}>
              Create User
            </button>

            {userMsg && (
              <p style={{ marginTop: 10, fontSize: 14 }}>
                {userMsg}
              </p>
            )}
          </div>

        </div>

        {/* Queue Table */}
        <div style={{ marginTop: "40px" }}>
          <h3 style={{ marginBottom: "15px" }}>
            Processing Queue ({terminal})
          </h3>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{ background: "#f1f1f1" }}>
                  <th style={thStyle}>BL Number</th>
                  <th style={thStyle}>Stage</th>
                  <th style={thStyle}>Last Update</th>
                  <th style={thStyle}>Handling Admin</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item, index) => (
                  <tr key={index}>
                    <td style={tdStyle}>
                      <span
                        style={{
                          color: "#0d5bd7",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                        onClick={() =>
                          router.push(`/admin/review?bl=${item.bl_number}`)
                        }
                      >
                        {item.bl_number}
                      </span>
                    </td>
                    <td style={tdStyle}>{item.stage}</td>
                    <td style={tdStyle}>
                      {item.timestamp
                        ? new Date(item.timestamp).toLocaleString()
                        : "-"}
                    </td>
                    <td style={tdStyle}>{item.handling_admin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

const thStyle = {
  padding: "10px",
  border: "1px solid #ddd",
  textAlign: "left" as const,
};

const tdStyle = {
  padding: "10px",
  border: "1px solid #ddd",
};