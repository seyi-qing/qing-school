# Release process

## Version numbers

We follow **semver** in `package.json` and `lib/version.ts`:

| Part | When to bump |
|------|----------------|
| **MAJOR** | Breaking API / data model for tenants |
| **MINOR** | New features (password gate, modules) |
| **PATCH** | Bug fixes only |

## Checklist before tagging a release

1. `npm run test:unit` passes
2. Local `next build` succeeds
3. Vercel production deploy is **Ready** (green)
4. Update `CHANGELOG.md` under a new heading
5. Set matching version in `package.json` and `lib/version.ts`
6. Optional GitHub release: tag `v1.2.0` on `main` with changelog notes

## Git tags (from a machine with push access)

```bash
git tag -a v1.2.0 -m "v1.2.0 Password gate + polish"
git push origin v1.2.0
```

## What end users see

- Admins: Settings → Security (existing)
- **Everyone**: Sidebar → **Change password** → `/account/password`
- New staff / reset passwords: redirected to change password on first login
