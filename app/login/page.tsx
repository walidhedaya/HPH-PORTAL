"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const translations = {
  en: {
    title: "Login",
    username: "Username",
    password: "Password",
    login: "Login",
    error: "Invalid username or password",
  },
  ar: {
    title: "تسجيل الدخول",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    login: "دخول",
    error: "اسم المستخدم أو كلمة المرور غير صحيحة",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "ar">("ar");
  const t = translations[lang];

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(25px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const handleLogin = async () => {
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tax_id: username,
        password,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      setError(t.error);
      return;
    }

    // Save session
    localStorage.setItem("tax_id", data.tax_id);
    localStorage.setItem("role", data.role);

    router.push("/select-terminal");
  };

  return (
    <div className="page-bg">
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

      <div
        className="card"
        dir={lang === "ar" ? "rtl" : "ltr"}
        style={{ animation: "fadeUp 0.6s ease-out" }}
      >
        <img src="/assets/logoi.png" className="logo" />
        <h2>{t.title}</h2>

        <input
          placeholder={t.username}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder={t.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button onClick={handleLogin}>{t.login}</button>
      </div>
    </div>
  );
}