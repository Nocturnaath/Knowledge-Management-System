import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  KeyRound,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  ShieldUser,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './HakAkses.css';

const ROLE_META = {
  super_admin: { label: 'Super Admin', icon: ShieldCheck, className: 'biru' },
  admin: { label: 'Admin', icon: ShieldUser, className: 'biru' },
  staff_it: { label: 'Staff IT', icon: KeyRound, className: 'biru' },
  staff_divisi: { label: 'Staff Divisi Keuangan', icon: UsersRound, className: 'hijau' },
};

const VISIBLE_PERMISSION_KEYS = [
  'kelola_kategori',
  'akses_dokumen_sensitif',
  'review_dokumen',
  'acc_final',
  'kelola_hak_akses',
];

export default function HakAkses() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [selectedRole, setSelectedRole] = useState('super_admin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState('');
  const [manager, setManager] = useState(null);
  const [managerMode, setManagerMode] = useState('role');
  const [saving, setSaving] = useState(false);
  const [draftRoles, setDraftRoles] = useState([]);
  const [roleToAdd, setRoleToAdd] = useState('');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [confirmRoleSave, setConfirmRoleSave] = useState(false);
  const [expandedRoleUsers, setExpandedRoleUsers] = useState(null);

  const muat = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/hak-akses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || 'Gagal memuat hak akses.');
        return;
      }
      setData(json);
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    muat();
  }, [muat]);

  const ubahIzinPeran = async (role, key, allowed) => {
    setError('');
    setData((d) => ({
      ...d,
      peran: d.peran.map((item) =>
        item.key === role
          ? {
              ...item,
              izin: allowed
                ? [...new Set([...item.izin, key])]
                : item.izin.filter((perm) => perm !== key),
            }
          : item
      ),
    }));

    try {
      const res = await fetch(`${API_URL}/api/hak-akses/peran/${role}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ perm_key: key, allowed }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal menyimpan perubahan.');
    } catch (err) {
      setError(err.message || 'Gagal menyimpan perubahan.');
      setData((d) => ({
        ...d,
        peran: d.peran.map((item) =>
          item.key === role
            ? {
                ...item,
                izin: allowed
                  ? item.izin.filter((perm) => perm !== key)
                  : [...new Set([...item.izin, key])],
              }
            : item
        ),
      }));
    }
  };

  const ubahIzinPengguna = async (userId, key, allowed) => {
    setError('');
    setData((d) => {
      const pengguna = d.pengguna.map((user) =>
        user.id === userId
          ? {
              ...user,
              izin: allowed
                ? [...new Set([...user.izin, key])]
                : user.izin.filter((perm) => perm !== key),
            }
          : user
      );
      return { ...d, pengguna };
    });
    setManager((current) =>
      current?.id === userId
        ? {
            ...current,
            izin: allowed
              ? [...new Set([...current.izin, key])]
              : current.izin.filter((perm) => perm !== key),
          }
        : current
    );

    try {
      const res = await fetch(`${API_URL}/api/hak-akses/pengguna/${userId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ perm_key: key, allowed }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal menyimpan perubahan.');
      await muat();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan perubahan.');
      setData((d) => {
        const pengguna = d.pengguna.map((user) =>
          user.id === userId
            ? {
                ...user,
                izin: allowed
                  ? user.izin.filter((perm) => perm !== key)
                  : [...new Set([...user.izin, key])],
              }
            : user
        );
        return { ...d, pengguna };
      });
      setManager((current) =>
        current?.id === userId
          ? {
              ...current,
              izin: allowed
                ? current.izin.filter((perm) => perm !== key)
                : [...new Set([...current.izin, key])],
            }
          : current
      );
    }
  };

  const ubahPeranPengguna = async (userId, roles) => {
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/hak-akses/pengguna/${userId}/peran`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal mengubah peran.');
      await muat();
      setManager(null);
      setConfirmRoleSave(false);
    } catch (err) {
      setError(err.message || 'Gagal mengubah peran.');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    return data.pengguna.filter((user) => {
      const matchesSearch =
        !query ||
        user.nama.toLowerCase().includes(query) ||
        (user.divisi || '').toLowerCase().includes(query);
      const matchesDivision = !division || (user.divisi || '') === division;
      return matchesSearch && matchesDivision;
    });
  }, [data, search, division]);

  const divisions = useMemo(
    () => (data ? [...new Set(data.pengguna.map((user) => user.divisi).filter(Boolean))] : []),
    [data]
  );

  const visiblePermissions = useMemo(() => {
    if (!data) return [];
    return data.izin.filter((permission) => VISIBLE_PERMISSION_KEYS.includes(permission.key));
  }, [data]);

  const managerPermissionOverrides = useMemo(() => {
    if (!data || !manager) return [];
    return (data.override || [])
      .filter((item) => item.user_id === manager.id)
      .map((item) => ({
        ...item,
        permission: data.izin.find((permission) => permission.key === item.perm_key),
      }))
      .filter((item) => VISIBLE_PERMISSION_KEYS.includes(item.perm_key));
  }, [data, manager]);

  if (loading) return <div className="ha-pesan">Memuat hak akses...</div>;
  if (!data) return <div className="ha-pesan error">{error}</div>;

  const selectedRoleData =
    data.peran.find((item) => item.key === selectedRole) || data.peran[0];
  const activeVisiblePermissionCount = visiblePermissions.filter((permission) =>
    selectedRoleData.izin.includes(permission.key)
  ).length;

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="ha-page">
      <div className="ha-head">
        <div>
          <h1>Hak Akses (RBAC)</h1>
          <p className="ha-sub">Atur hak akses melalui peran (role) yang dimiliki pengguna.</p>
        </div>
      </div>

      {error && <div className="ha-pesan error">{error}</div>}

      <section className="ha-panel ha-role-panel">
        <div className="ha-panel-title">
          <div className="ha-title-icon"><UsersRound size={19} /></div>
          <div>
            <h2>Kelola Peran</h2>
            <p>Kumpulan permission untuk setiap peran.</p>
          </div>
        </div>

        <div className="ha-role-layout">
          <aside className="ha-role-list">
            <h3>Daftar Role</h3>
            {data.peran.map((role) => {
              const meta = ROLE_META[role.key] || ROLE_META.admin;
              const Icon = meta.icon;
              const activePermissionCount = visiblePermissions.filter((permission) =>
                role.izin.includes(permission.key)
              ).length;
              const roleUsers = data.pengguna.filter((user) =>
                (user.roles || [user.role]).includes(role.key)
              );
              return (
                <div className="ha-role-item" key={role.key}>
                  <button
                    type="button"
                    className={selectedRole === role.key ? 'active' : ''}
                    onClick={() => {
                      setSelectedRole(role.key);
                      setExpandedRoleUsers((current) => current === role.key ? null : role.key);
                    }}
                  >
                    <Icon size={19} />
                    <span>
                      <strong>{meta.label}</strong>
                      <small>
                        {role.key === 'super_admin'
                          ? `Seluruh fitur · ${roleUsers.length} pengguna`
                          : activePermissionCount === 0
                            ? `Belum ada permission aktif · ${roleUsers.length} pengguna`
                            : `${activePermissionCount} permission aktif · ${roleUsers.length} pengguna`}
                      </small>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              );
            })}
          </aside>

          {expandedRoleUsers && (() => {
            const expandedRole = data.peran.find((role) => role.key === expandedRoleUsers);
            const expandedUsers = data.pengguna.filter((user) =>
              (user.roles || [user.role]).includes(expandedRoleUsers)
            );
            const expandedRoleIndex = data.peran.findIndex((role) => role.key === expandedRoleUsers);
            return (
              <div
                className="ha-role-user-popover"
                style={{ top: `${38 + (expandedRoleIndex * 50)}px` }}
              >
                <strong>
                  {ROLE_META[expandedRoleUsers]?.label || expandedRole?.nama}
                </strong>
                {expandedUsers.map((user) => (
                  <div key={user.id}>
                    <span>{user.nama}</span>
                    <small>{user.divisi || '-'}</small>
                  </div>
                ))}
                {expandedUsers.length === 0 && (
                  <small className="ha-role-user-empty">Belum ada pengguna</small>
                )}
              </div>
            );
          })()}

          <div className="ha-permissions">
            <h3>Permission yang Dimiliki</h3>
            <div className="ha-permission-grid">
              {visiblePermissions.map((perm) => (
                <label key={perm.key} className="ha-permission-check">
                  <input
                    type="checkbox"
                    checked={selectedRoleData.izin.includes(perm.key)}
                    disabled={selectedRole === 'super_admin'}
                    onChange={(event) => ubahIzinPeran(selectedRole, perm.key, event.target.checked)}
                  />
                  <span>{perm.label}</span>
                </label>
              ))}
            </div>
            <div className="ha-permission-note">
              <KeyRound size={17} />
              <span>
                <strong>{ROLE_META[selectedRole]?.label || selectedRoleData.nama}</strong>{' '}
                {selectedRole === 'super_admin'
                  ? 'memiliki seluruh permission.'
                  : activeVisiblePermissionCount === 0
                    ? 'belum memiliki permission aktif.'
                    : `memiliki ${activeVisiblePermissionCount} permission aktif.`}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="ha-bottom-grid">
        <section className="ha-panel ha-users-panel">
          <div className="ha-panel-title">
            <div className="ha-title-icon"><ShieldUser size={19} /></div>
            <div>
              <h2>Kelola Pengguna</h2>
              <p>Daftar pengguna C-BIJAK · {data.pengguna.length} pengguna terdaftar.</p>
            </div>
          </div>

          <div className="ha-user-tools">
            <label className="ha-search">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau divisi..." />
            </label>
            <select
              className="ha-division-select"
              value={division}
              onChange={(event) => setDivision(event.target.value)}
              aria-label="Filter divisi"
            >
              <option value="">Semua Divisi</option>
              {divisions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="ha-user-table">
            <div className="ha-user-row ha-user-head">
              <span>ID</span><span>Nama</span><span>Divisi</span><span>Role</span><span>Aksi</span>
            </div>
            {filteredUsers.map((user) => {
              const userRoles = user.roles || [user.role];
              return (
                <div className="ha-user-row" key={user.id}>
                  <strong>{String(user.id).padStart(4, '0')}</strong>
                  <strong>{user.nama}</strong>
                  <span>{user.divisi || '-'}</span>
                  <span className="ha-role-badges">
                    {userRoles.map((role) => (
                      <span key={role} className={`ha-role-badge ${ROLE_META[role]?.className || 'biru'}`}>
                        {ROLE_META[role]?.label || role}
                      </span>
                    ))}
                  </span>
                  <button type="button" onClick={() => {
                    setManager(user);
                    setDraftRoles(userRoles);
                    setRoleToAdd('');
                    setConfirmRoleSave(false);
                    setManagerMode('role');
                  }}>Kelola</button>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {manager && (
        <div className="ha-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setManager(null)}>
          <div className="ha-modal" role="dialog" aria-modal="true" aria-labelledby="ha-modal-title">
            <button type="button" className="ha-modal-close" onClick={() => setManager(null)} aria-label="Tutup"><X size={18} /></button>
            <h2 id="ha-modal-title">Kelola Akses Pengguna</h2>
            <p>Pilih tindakan untuk <strong>{manager.nama}</strong>.</p>
            <div className="ha-modal-options">
              <button type="button" className={managerMode === 'role' ? 'active' : ''} onClick={() => setManagerMode('role')}>
                <ShieldUser size={19} />
                <span><strong>Ganti Peran</strong><small>Ubah peran untuk pengguna ini.</small></span>
                <ArrowRight size={16} />
              </button>
              <button type="button" className={managerMode === 'access' ? 'active' : ''} onClick={() => setManagerMode('access')}>
                <KeyRound size={19} />
                <span><strong>Hanya Kelola Hak Akses</strong><small>Atur permission tambahan atau pengecualian.</small></span>
                <ArrowRight size={16} />
              </button>
            </div>

            {managerMode === 'role' ? (
              <div className="ha-role-manager">
                <div className="ha-role-manager-head">
                  <strong>Role yang Dimiliki</strong>
                  <span>{draftRoles.length} aktif</span>
                </div>
                <div className="ha-draft-roles">
                  {draftRoles.map((role) => {
                    const meta = ROLE_META[role] || ROLE_META.admin;
                    const Icon = meta.icon;
                    return (
                      <div className="ha-draft-role" key={role}>
                        <Icon size={17} />
                        <span>
                          <strong>{meta.label}</strong>
                          <small>Aktif</small>
                        </span>
                        <button
                          type="button"
                          aria-label={`Hapus peran ${meta.label}`}
                          disabled={draftRoles.length === 1}
                          onClick={() => setDraftRoles((roles) => roles.filter((item) => item !== role))}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="ha-add-role">
                  <div className="ha-role-dropdown">
                    <button
                      type="button"
                      className="ha-role-dropdown-trigger"
                      aria-haspopup="listbox"
                      aria-expanded={roleMenuOpen}
                      onClick={() => setRoleMenuOpen((open) => !open)}
                    >
                      <span>
                        {roleToAdd
                          ? ROLE_META[roleToAdd]?.label || data.peran.find((role) => role.key === roleToAdd)?.nama
                          : 'Pilih peran baru...'}
                      </span>
                      <ChevronDown size={15} />
                    </button>
                    {roleMenuOpen && (
                      <div className="ha-role-dropdown-menu" role="listbox">
                        {data.peran
                          .filter((role) => !draftRoles.includes(role.key))
                          .map((role) => {
                            const Icon = ROLE_META[role.key]?.icon || ShieldUser;
                            const label = ROLE_META[role.key]?.label || role.nama;
                            return (
                              <button
                                type="button"
                                role="option"
                                aria-selected={roleToAdd === role.key}
                                key={role.key}
                                onClick={() => {
                                  setRoleToAdd(role.key);
                                  setRoleMenuOpen(false);
                                }}
                              >
                                <Icon size={15} />
                                <span>{label}</span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!roleToAdd}
                    onClick={() => {
                      setDraftRoles((roles) => [...roles, roleToAdd]);
                      setRoleToAdd('');
                    }}
                  >
                    <Plus size={15} /> Tambah Peran
                  </button>
                </div>

                <div className="ha-effective-preview">
                  <strong>Permission Efektif</strong>
                  <div>
                    {visiblePermissions
                      .filter((permission) =>
                        data.peran
                          .filter((role) => draftRoles.includes(role.key))
                          .some((role) => role.izin.includes(permission.key))
                      )
                      .map((permission) => (
                        <span key={permission.key}><Check size={12} /> {permission.label}</span>
                      ))}
                  </div>
                  {managerPermissionOverrides.length > 0 && (
                    <div className="ha-user-special-permissions">
                      <strong>Hak Akses Khusus Pengguna</strong>
                      {managerPermissionOverrides.map((item) => (
                        <span
                          key={item.perm_key}
                          className={item.allowed ? 'granted' : 'revoked'}
                        >
                          {item.allowed ? <Check size={12} /> : <X size={12} />}
                          {item.permission?.label || item.perm_key}
                          <small>{item.allowed ? 'Diberikan khusus' : 'Dicabut khusus'}</small>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {confirmRoleSave ? (
                  <div className="ha-role-confirm">
                    <strong>Simpan perubahan role?</strong>
                    <p>
                      Peran lama tidak akan dihapus tanpa tindakan Hapus Peran. Permission efektif akan dihitung ulang dari semua role yang dipilih.
                    </p>
                    <div className="ha-modal-action">
                      <button type="button" className="ha-secondary" onClick={() => setConfirmRoleSave(false)}>Kembali</button>
                      <button type="button" className="ha-primary" disabled={saving} onClick={() => ubahPeranPengguna(manager.id, draftRoles)}>
                        {saving ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ha-modal-action">
                    <button type="button" className="ha-secondary" onClick={() => setManager(null)}>Batal</button>
                    <button
                      type="button"
                      className="ha-primary"
                      disabled={saving || draftRoles.length === 0}
                      onClick={() => setConfirmRoleSave(true)}
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="ha-modal-permissions">
                {visiblePermissions.map((perm) => (
                  <label key={perm.key}>
                    <input
                      type="checkbox"
                      checked={manager.izin.includes(perm.key)}
                      disabled={manager.role === 'super_admin'}
                      onChange={(event) => ubahIzinPengguna(manager.id, perm.key, event.target.checked)}
                    />
                    <span>{perm.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
