"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ExportRow = {
  id: number;
  booking_number: string;
  tax_id: string;
  terminal: string;
  stuffing: number;
  inspection: number;
  inspection_containers: number;
  stage: string;
  created_at: string;
};

export default function AdminExportPage() {
  const [rows, setRows] = useState<ExportRow[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const res = await fetch("/api/admin/export-queue");
    const data = await res.json();
    if (data.success) {
      setRows(data.data);
    }
  }

  function goToDetails(booking: string) {
    router.push(`/admin/export/${booking}`);
  }

  return (
    <div className="page-bg">
      <div className="card admin-card">
        <h2>Admin Export Control Panel</h2>

        <table style={{ width: "100%", marginTop: 20 }}>
          <thead>
            <tr>
              <th>Booking</th>
              <th>Terminal</th>
              <th>Tax ID</th>
              <th>Stuffing</th>
              <th>Inspection</th>
              <th>Stage</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <span
                    style={{
                      color: "#1e4ed8",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                    onClick={() =>
                      goToDetails(row.booking_number)
                    }
                  >
                    {row.booking_number}
                  </span>
                </td>
                <td>{row.terminal}</td>
                <td>{row.tax_id}</td>
                <td>{row.stuffing ? "Yes" : "No"}</td>
                <td>
                  {row.inspection
                    ? `Yes (${row.inspection_containers})`
                    : "No"}
                </td>
                <td>{row.stage}</td>
                <td>{row.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
