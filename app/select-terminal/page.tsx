"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const translations = {
  en: {
    title: "Select Terminal",
    aqct: "Abu Qir Container Terminal (AQCT)",
    rsct: "Red Sea Container Terminal (RSCT)",
    dct: "Dekheila Container Terminal (DCT)",
  },
  ar: {
    title: "اختيار المحطة",
    aqct: "محطة حاويات أبو قير",
    rsct: "محطة حاويات البحر الأحمر",
    dct: "محطة حاويات الدخيلة",
  },
};

export default function SelectTerminalPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "ar">("en");
  const t = translations[lang];

  function selectTerminal(code: string) {
    localStorage.setItem("terminal", code);
    router.push("/select-service");
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
      <div className="card" dir={lang === "ar" ? "rtl" : "ltr"}>
        <img src="/assets/logoi.png" className="logo" alt="Logo" />

        <h2>{t.title}</h2>

        <button
          style={{ marginBottom: "14px" }}
          onClick={() => selectTerminal("AQCT")}
        >
          {t.aqct}
        </button>

        <button
          style={{ marginBottom: "14px" }}
          onClick={() => selectTerminal("RSCT")}
        >
          {t.rsct}
        </button>

        <button onClick={() => selectTerminal("DCT")}>{t.dct}</button>
      </div>
    </div>
  );
}
