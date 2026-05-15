"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function UsersControlPage() {
  const router = useRouter();

  const [taxId, setTaxId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [superAdminPassword, setSuperAdminPassword] = useState("");
  const [fullAccess, setFullAccess] = useState(false);
  const [allowedTaxIds, setAllowedTaxIds] = useState("");
  const [userMsg, setUserMsg] = useState<string | null>(null);

  const [editTaxId, setEditTaxId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirm, setEditConfirm] = useState("");
  const [editAllowedTaxIds, setEditAllowedTaxIds] = useState("");
  const [editBlocked, setEditBlocked] = useState(false);
  const [updateBlocked, setUpdateBlocked] = useState(false);
  const [editUserMsg, setEditUserMsg] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole !== "admin" && storedRole !== "super_admin") {
      router.push("/login");
    }
  }, [router]);

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

    if (role === "admin" && !superAdminPassword) {
      setUserMsg("Super Admin Password is required");
      return;
    }

    const res = await fetch("/api/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tax_id: taxId.trim(),
        password,
        role,
        super_admin_password: role === "admin" ? superAdminPassword : undefined,
        full_access: fullAccess,
        allowed_tax_ids: allowedTaxIds
          .split(",")
          .map(t => t.trim())
          .filter(Boolean),
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
    setSuperAdminPassword("");
    setAllowedTaxIds("");
    setFullAccess(false);
  };

  const handleEditUser = async () => {
    setEditUserMsg(null);

    if (!editTaxId.trim()) {
      setEditUserMsg("Tax ID is required");
      return;
    }

    if (!editPassword && !editAllowedTaxIds.trim() && !updateBlocked) {
      setEditUserMsg("Enter a new password, tax IDs to add, or blocked status");
      return;
    }

    if (editPassword !== editConfirm) {
      setEditUserMsg("Passwords do not match");
      return;
    }

    const body: {
      tax_id: string;
      password: string;
      allowed_tax_ids: string[];
      is_blocked?: boolean;
    } = {
      tax_id: editTaxId.trim(),
      password: editPassword,
      allowed_tax_ids: editAllowedTaxIds
        .split(",")
        .map(t => t.trim())
        .filter(Boolean),
    };

    if (updateBlocked) {
      body.is_blocked = editBlocked;
    }

    const res = await fetch("/api/edit-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      setEditUserMsg(data.error || "Failed to edit user");
      return;
    }

    const parts = [];

    if (data.password_updated) parts.push("password updated");
    if (data.added_tax_ids > 0) {
      parts.push(`${data.added_tax_ids} tax ID(s) added`);
    }
    if (editAllowedTaxIds.trim() && data.added_tax_ids === 0) {
      parts.push("no new tax IDs added");
    }
    if (data.block_status_updated) {
      parts.push(data.is_blocked ? "user blocked" : "user unblocked");
    }

    setEditUserMsg(`User updated: ${parts.join(", ")}`);
    setEditTaxId("");
    setEditPassword("");
    setEditConfirm("");
    setEditAllowedTaxIds("");
    setEditBlocked(false);
    setUpdateBlocked(false);
  };

  return (
    <div className="page-bg">
      <div className="card admin-card">
        <button
          onClick={() => router.push("/admin/import")}
          style={{
            marginBottom: "20px",
            background: "#6c757d",
            color: "white",
            padding: "8px 12px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Back to Admin Import
        </button>

        <h2 style={{ marginBottom: "25px" }}>
          Users Control
        </h2>

        <div className="admin-grid" style={{ alignItems: "start", gap: "28px" }}>
          <div className="mini-card" style={{ padding: "28px" }}>
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

            <select
              value={role}
              onChange={e => {
                const nextRole = e.target.value as "admin" | "user";
                setRole(nextRole);
                if (nextRole !== "admin") {
                  setSuperAdminPassword("");
                }
              }}
              style={{
                width: "100%",
                padding: "14px",
                marginBottom: "14px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                fontSize: "15px",
              }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>

            {role === "admin" && (
              <input
                type="password"
                placeholder="Super Admin Password"
                value={superAdminPassword}
                onChange={e => setSuperAdminPassword(e.target.value)}
              />
            )}

            <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <input
                type="checkbox"
                checked={fullAccess}
                onChange={e => setFullAccess(e.target.checked)}
                style={{ width: "auto", margin: 0 }}
              />
              Full Access
            </label>

            {!fullAccess && (
              <input
                placeholder="Allowed Tax IDs (comma separated)"
                value={allowedTaxIds}
                onChange={e => setAllowedTaxIds(e.target.value)}
              />
            )}

            <button onClick={handleCreateUser}>
              Create User
            </button>

            {userMsg && <p>{userMsg}</p>}
          </div>

          <div className="mini-card" style={{ padding: "28px" }}>
            <h4>Edit User</h4>

            <input
              placeholder="Existing User Tax ID"
              value={editTaxId}
              onChange={e => setEditTaxId(e.target.value)}
            />

            <input
              type="password"
              placeholder="New Password"
              value={editPassword}
              onChange={e => setEditPassword(e.target.value)}
            />

            <input
              type="password"
              placeholder="Confirm New Password"
              value={editConfirm}
              onChange={e => setEditConfirm(e.target.value)}
            />

            <input
              placeholder="Tax IDs to Add (comma separated)"
              value={editAllowedTaxIds}
              onChange={e => setEditAllowedTaxIds(e.target.value)}
            />

            <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <input
                type="checkbox"
                checked={updateBlocked}
                onChange={e => setUpdateBlocked(e.target.checked)}
                style={{ width: "auto", margin: 0 }}
              />
              Update blocked status
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", opacity: updateBlocked ? 1 : 0.55 }}>
              <input
                type="checkbox"
                checked={editBlocked}
                disabled={!updateBlocked}
                onChange={e => setEditBlocked(e.target.checked)}
                style={{ width: "auto", margin: 0 }}
              />
              Blocked
            </label>

            <button onClick={handleEditUser}>
              Update User
            </button>

            {editUserMsg && <p>{editUserMsg}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
