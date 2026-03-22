"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "../auth/auth.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const router = useRouter();

  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const showEmailError = touched.email && email && !emailValid;
  const showPasswordError = touched.password && password && password.length < 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTouched({ email: true, password: true });

    if (!email || !password) {
      setError("E-posta ve şifre gerekli.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, password })
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Kayıt başarısız. Lütfen tekrar deneyin.");
        return;
      }
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false
      });
      if (signInRes?.error) {
        setError("Kayıt tamamlandı. Lütfen giriş yapın.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container} role="main">
      <div className={styles.card}>
        <h1 className={styles.title}>Kayıt ol</h1>
        <p className={styles.subtitle}>Socialflow Publisher hesabı oluşturun</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.inputGroup}>
            <label htmlFor="register-email" className={styles.label}>
              E-posta
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="ornek@email.com"
              required
              autoComplete="email"
              autoFocus
              aria-invalid={showEmailError || undefined}
              aria-describedby={showEmailError ? "register-email-error" : undefined}
              className={`${styles.input} ${showEmailError ? styles.inputError : ""}`}
            />
            {showEmailError && (
              <p id="register-email-error" className={styles.errorMessage} role="alert">
                Geçerli bir e-posta adresi girin
              </p>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="register-name" className={styles.label}>
              Ad <span className={styles.labelOptional}>(opsiyonel)</span>
            </label>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adınız (isteğe bağlı)"
              autoComplete="name"
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="register-password" className={styles.label}>
              Şifre
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder="En az 8 karakter"
              required
              minLength={8}
              autoComplete="new-password"
              aria-invalid={showPasswordError || undefined}
              aria-describedby={showPasswordError ? "register-password-error" : "register-password-hint"}
              className={`${styles.input} ${showPasswordError ? styles.inputError : ""}`}
            />
            {showPasswordError ? (
              <p id="register-password-error" className={styles.errorMessage} role="alert">
                Şifre en az 8 karakter olmalıdır
              </p>
            ) : (
              <p id="register-password-hint" className={styles.hint}>
                Minimum 8 karakter
              </p>
            )}
          </div>

          {error && (
            <p className={styles.errorMessage} role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? "Kayıt yapılıyor..." : "Kayıt ol"}
          </button>
        </form>

        <div className={styles.footer}>
          <a href="/login" className={styles.footerLink}>
            Zaten hesabınız var mı? Giriş yapın
          </a>
        </div>
      </div>
    </main>
  );
}
