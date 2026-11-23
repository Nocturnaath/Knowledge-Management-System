const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeEffectivePermissions, canRemoveLastSuperAdmin, isPublicDocumentAccessible } = require('../utils/authorization');

test('effective permissions are the union of roles followed by overrides', () => {
  const permissions = mergeEffectivePermissions(
    ['dokumen.unggah', 'dokumen.kelola', 'aplikasi.kelola'],
    [
      { perm_key: 'dokumen.acc_final', allowed: true },
      { perm_key: 'dokumen.kelola', allowed: false },
    ],
  );
  assert.deepEqual(new Set(permissions), new Set(['dokumen.unggah', 'aplikasi.kelola', 'dokumen.acc_final']));
});

test('last super admin cannot be removed', () => {
  assert.equal(canRemoveLastSuperAdmin(1, true), false);
  assert.equal(canRemoveLastSuperAdmin(2, true), true);
  assert.equal(canRemoveLastSuperAdmin(1, false), true);
});

test('only approved documents with the public flag are public', () => {
  assert.equal(isPublicDocumentAccessible({ status: 'approved', isPublic: 1 }), true);
  assert.equal(isPublicDocumentAccessible({ status: 'pending', isPublic: 1 }), false);
  assert.equal(isPublicDocumentAccessible({ status: 'approved', isPublic: 0 }), false);
});
