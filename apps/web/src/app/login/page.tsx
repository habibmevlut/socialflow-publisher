"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../auth/auth.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = !password || password.length >= 1;
  const showEmailError = touched.email && !emailValid;
  const showPasswordError = touched.password && !password;

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

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false
      });
      if (res?.error) {
        setError("E-posta veya şifre hatalı. Lütfen tekrar deneyin.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Bir bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container} role="main">
      <div className={styles.card}>
        <h1 className={styles.title}>Socialflow Publisher</h1>
        <p className={styles.subtitle}>Hesabınıza giriş yapın</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.inputGroup}>
            <label htmlFor="login-email" className={styles.label}>
              E-posta
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="ornek@email.com"
              required
              autoComplete="email"
              autoFocus
              aria-invalid={showEmailError || undefined}
              aria-describedby={showEmailError ? "login-email-error" : undefined}
              className={`${styles.input} ${showEmailError ? styles.inputError : ""}`}
            />
            {showEmailError && (
              <p id="login-email-error" className={styles.errorMessage} role="alert">
                Geçerli bir e-posta adresi girin
              </p>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="login-password" className={styles.label}>
              Şifre
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              aria-invalid={showPasswordError || undefined}
              aria-describedby={showPasswordError ? "login-password-error" : undefined}
              className={`${styles.input} ${showPasswordError ? styles.inputError : ""}`}
            />
            {showPasswordError && (
              <p id="login-password-error" className={styles.errorMessage} role="alert">
                Şifre gerekli
              </p>
            )}
          </div>

          {error && (
            <p className={styles.errorMessage} role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>

        <div className={styles.footer}>
          <a href="/register" className={styles.footerLink}>
            Hesabınız yok mu? Kayıt olun
          </a>
          <p className={styles.demoHint}>
            <strong>Demo:</strong> demo@socialflow.app / demo123
          </p>
        </div>
      </div>
    </main>
  );
}
