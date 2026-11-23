function mergeEffectivePermissions(rolePermissions, overrides) {
  const effective = new Set(rolePermissions);
  overrides.forEach(({ perm_key: permission, allowed }) => {
    if (allowed) effective.add(permission);
    else effective.delete(permission);
  });
  return [...effective];
}

function canRemoveLastSuperAdmin(superAdminCount, removingSuperAdmin) {
  return !(removingSuperAdmin && superAdminCount <= 1);
}

function isPublicDocumentAccessible(document) {
  return document.status === 'approved' && Boolean(document.isPublic);
}

module.exports = { mergeEffectivePermissions, canRemoveLastSuperAdmin, isPublicDocumentAccessible };
