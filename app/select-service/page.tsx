"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const translations = {
  en: {
    title: "Select Service",
    import: "Import",
    export: "Export",
  },
  ar: {
    title: "اختيار الخدمة",
    import: "وارد",
    export: "صادر",
  },
};

export default function SelectServicePage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "ar">("en");
  const t = translations[lang];

  useEffect(() => {
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

  function goTo(service: "import" | "export") {
    const role = localStorage.getItem("role") || "user";

    if (role === "admin") {
      router.push(`/admin/${service}`);
    } else {
      router.push(`/${service}`);
    }
  }

  return (
    <div className="page-bg">
      {/* Language Switch */}
      <div className="lang-switch">
        <button
          className={lang === "en" ? "active" : ""}
          onClick={() => setLang("en")}
        >
          EN
        </button>
        <button
          className={lang === "ar" ? "active" : ""}
          onClick={() => setLang("ar")}
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
          onClick={() => goTo("import")}
        >
          {t.import}
        </button>

        <button onClick={() => goTo("export")}>{t.export}</button>
      </div>
    </div>
  );
}
