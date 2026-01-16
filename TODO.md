# PR Checklist

Complete all items below before submitting a pull request.

- [ ] Increase gap between sections to 40px
- [ ] Complete comprehensive security audit (OWASP Top 10, authentication, input validation, API security, data handling)
- [ ] Make UI refinements (accessibility improvements + visual polish)
- [ ] Swap instances of icon usage to make use of [Phosphor Icons](https://github.com/phosphor-icons/homepage)
- [ ] Change specific references to Webflow at the UI level (rebrand to "Website UI Mapper" - the app supports Webflow but is equally useful for other modern platforms)
- [ ] Make the default column width 1200px, but a max-width of 1440px for larger screens

## Notes

- Keep `WebflowExport` type name unchanged (internal implementation detail)
- Security audit should be documented in `SECURITY_AUDIT.md`
- UI refinements should maintain existing design system consistency
- Icon replacements: Lucide → Phosphor Icons (install `@phosphor-icons/react`)
