'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  RefreshCw, 
  BrainCircuit, 
  BarChart3, 
  FileSpreadsheet, 
  Settings, 
  LogOut, 
  Activity 
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('Dr. Vaishnav');

  useEffect(() => {
    // Read session username if client-side
    const session = document.cookie
      .split('; ')
      .find(row => row.startsWith('user_session='));
    if (session) {
      try {
        const user = JSON.parse(decodeURIComponent(session.split('=')[1]));
        if (user && user.name) {
          setUserName(user.name);
        }
      } catch (e) {
        // use default
      }
    }
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Patients', path: '/patients', icon: Users },
    { name: 'Data Warehouse', path: '/warehouse', icon: Database },
    { name: 'ETL Management', path: '/etl', icon: RefreshCw },
    { name: 'Disease Prediction', path: '/prediction', icon: BrainCircuit },
    { name: 'Analytics', path: '/analytics', icon: Activity },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth', { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.logoArea}>
        <BrainCircuit className={styles.logoIcon} size={28} />
        <span className={styles.logoText}>
          Healthcare DSS<br />
          <span style={{ fontSize: '0.65rem', fontWeight: 550, color: '#64748b' }}>Data Warehouse & Predictive Mining</span>
        </span>
      </div>

      <nav className={styles.navSection}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
          return (
            <Link 
              key={item.path} 
              href={item.path}
              onClick={onClose}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.profileFooter}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.userRole}>Clinical Director</span>
        </div>
        <button 
          onClick={handleLogout} 
          className={styles.logoutBtn}
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
