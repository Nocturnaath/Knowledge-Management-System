import React from 'react';
import './Notifications.css';

const notifications = [];

export default function Notifications() {
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
        {notifications.map((notification, index) => (
          <article className="notification-item" key={`${notification.time}-${index}`}>
            <span>{notification.message}</span>
            <time>{notification.time}</time>
          </article>
        ))}
      </section>
    </main>
  );
}
