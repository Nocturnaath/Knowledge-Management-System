import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './Notifications.css';

export default function Notifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dokumen/aktivitas`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Gagal memuat notifikasi.');
        setNotifications(data.activities);
      } catch (requestError) {
        setError(requestError.message);
      }
    };
    loadNotifications();
  }, [token]);

  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  return (
    <main className="notifications-page">
      <header className="notifications-header">
        <div>
          <h1>Notifikasi</h1>
          <p>Aktivitas unggah &amp; pembaruan berkas.</p>
        </div>
        <time dateTime={new Date().toISOString()}>{today}</time>
      </header>

      <section className="notifications-list" aria-label="Daftar notifikasi">
        {error ? <p className="notifications-error">{error}</p> : null}
        {notifications.map((notification) => (
        <article className="notification-item" key={notification.id}>
          <span><b>{notification.uploader}</b> {notification.eventType === 'update' ? 'memperbarui' : 'mengunggah'} dokumen <b>{notification.documentName}</b></span>
          <time>{new Date(notification.createdAt).toLocaleString('id-ID')}</time>
        </article>
        ))}
        {!error && notifications.length === 0 && <p className="notifications-empty">Belum ada aktivitas dokumen.</p>}
      </section>
    </main>
  );
}
