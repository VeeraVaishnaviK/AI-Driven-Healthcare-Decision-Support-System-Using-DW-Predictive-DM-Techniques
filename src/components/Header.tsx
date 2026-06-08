'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, Menu, AlertCircle, CheckCircle2, User } from 'lucide-react';
import Link from 'next/link';
import styles from './Header.module.css';

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Map pathnames to beautiful titles
  const getPageTitle = () => {
    switch (pathname) {
      case '/dashboard': return 'Dashboard Overview';
      case '/patients': return 'Patient Management';
      case '/warehouse': return 'Data Warehouse Explorer';
      case '/etl': return 'ETL Pipeline Management';
      case '/prediction': return 'Disease Screening & Prediction';
      case '/analytics': return 'Cohort Analytics';
      case '/reports': return 'Clinical & System Reports';
      case '/settings': return 'System Settings';
      default: return 'Healthcare Support System';
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/patients?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const notifications = [
    {
      id: 1,
      type: 'alert',
      title: 'High Risk Prediction Alert',
      desc: 'Sarah Jenkins (P001) triggered a 82.5% Diabetes Risk rating.',
      time: '10 mins ago'
    },
    {
      id: 2,
      type: 'success',
      title: 'ETL Pipeline Successful',
      desc: 'Daily EMR synchronization loaded 5 new patient visit records.',
      time: '3 hours ago'
    },
    {
      id: 3,
      type: 'alert',
      title: 'Systolic BP Alert',
      desc: 'Robert Miller (P006) entered clinical Stage 2 Hypertension (160 mmHg).',
      time: '5 hours ago'
    }
  ];

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <button className={styles.menuBtn} onClick={onMenuToggle}>
          <Menu size={24} />
        </button>
        <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
      </div>

      <div className={styles.rightSection}>
        <form onSubmit={handleSearchSubmit} className={styles.searchBar}>
          <Search className={styles.searchIcon} size={18} />
          <input 
            type="text" 
            placeholder="Search patients by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </form>

        <div className={styles.actions}>
          <div className={styles.notificationWrapper} ref={dropdownRef}>
            <button 
              className={styles.notificationBtn} 
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={20} />
              <span className={styles.badge}></span>
            </button>

            {showNotifications && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <span>Notifications</span>
                  <Link href="/dashboard" onClick={() => setShowNotifications(false)}>Clear all</Link>
                </div>
                <div className={styles.notificationList}>
                  {notifications.map((notif) => (
                    <div key={notif.id} className={styles.notificationItem}>
                      {notif.type === 'alert' ? (
                        <AlertCircle className={styles.alertIcon} size={16} />
                      ) : (
                        <CheckCircle2 className={styles.successIcon} size={16} />
                      )}
                      <div className={styles.notificationContent}>
                        <span className={styles.notificationTitle}>{notif.title}</span>
                        <span className={styles.notificationDesc}>{notif.desc}</span>
                        <span className={styles.notificationTime}>{notif.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
