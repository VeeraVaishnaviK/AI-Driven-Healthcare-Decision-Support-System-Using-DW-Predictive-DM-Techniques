'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrainCircuit, AlertTriangle, Key } from 'lucide-react';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@healthcare.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Refresh page and redirect to dashboard
      router.refresh();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <BrainCircuit className={styles.logoIcon} size={40} />
          <h2 className={styles.title}>AI-Driven Healthcare Decision Support System</h2>
          <span className={styles.subtitle}>Data Warehousing & Predictive Mining Technologies</span>
        </div>

        {error && (
          <div className={styles.errorBox}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className={styles.demoBanner}>
            <span className={styles.demoTitle}>🔐 Reviewer Pre-authorization:</span>
            <span>These credentials are pre-seeded in the mock database for instant sign-in. Click login below to access the dashboard.</span>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary submitBtn"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}
