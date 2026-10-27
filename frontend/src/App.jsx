import { useState } from 'react';
import Login from './login.jsx';
import Beranda from './beranda.jsx';
import DokumenSaya from './dokumenSaya.jsx';
import DokumenDivisi from './dokumenDivisi.jsx';
import UnggahDokumen from './unggahDokumen.jsx';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState('Beranda');
  const [documents, setDocuments] = useState([]);

  if (loggedIn) {
    const pageProps = {
      onNavigate: setActivePage,
      onLogout: () => {
        setLoggedIn(false);
        setActivePage('Beranda');
      },
    };

    if (activePage === 'Unggah Dokumen') {
      return (
        <UnggahDokumen
          {...pageProps}
          onCancel={() => setActivePage('Dokumen')}
          onSubmit={(document) => {
            setDocuments((currentDocuments) => [document, ...currentDocuments]);
            setActivePage('Dokumen');
          }}
        />
      );
    }

    if (activePage === 'Dokumen') {
      return (
        <DokumenSaya
          {...pageProps}
          documents={documents}
          onUploadClick={() => setActivePage('Unggah Dokumen')}
        />
      );
    }

    if (activePage === 'Dokumen Divisi') {
      return <DokumenDivisi {...pageProps} />;
    }

    return <Beranda {...pageProps} />;
  }

  return <Login onLogin={() => setLoggedIn(true)} />;
}
