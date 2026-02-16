"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const translations = {
  en: {
    title: "Export Services",
    empty: "Empty Release",
    entry: "Export Entry",
  },
  ar: {
    title: "خدمات الصادر",
    empty: "إفراج فارغ",
    entry: "تصدير حاويات",
  },
};

export default function ExportPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "ar">("en");
  const t = translations[lang];

  useEffect(() => {
    const savedLang =
      typeof window !== "undefined"
        ? localStorage.getItem("lang")
        : "en";

    if (savedLang === "ar") setLang("ar");

    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes fadeUp {
        from {
          opacity: 0;
          transform: translateY(25px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div className="page-bg">
      {/* Language Switch */}
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

      {/* Card */}
      <div
        className="card"
        style={{ animation: "fadeUp 0.6s ease-out" }}
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        <img src="/assets/logoi.png" className="logo" alt="Logo" />

        <h2>{t.title}</h2>

        <button
          style={{ marginBottom: "16px" }}
          onClick={() => router.push("/export/empty")}
        >
          {t.empty}
        </button>

        <button onClick={() => router.push("/export/entry")}>
          {t.entry}
        </button>
      </div>
    </div>
  );
}
