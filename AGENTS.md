<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep poster palettes independent of UI tokens; a shared canvas renderer handles preview, thumbnails, batch and export to prevent divergent output.
- Admin is a single server-owned password identity with a service-only profile, bcrypt hash, encrypted expiring cookie and durable atomic login limiter; never use browser storage to authorize admin work.
- Admin cookies are Secure, HttpOnly, SameSite=None and Partitioned so embedded previews can retain sessions; keep server-function CSRF checks enabled.
- Resolve TMDB credentials through the server-only provider resolver for both metadata and connection tests so configuration status and requests cannot diverge.
- Provider credentials are hosting secrets; the dashboard only manages durable enable flags and tests connections, because the runtime cannot write the hosting secret store.
- Templates store independently editable layer arrays keyed by template ID; inject the default logo for legacy projects without rewriting their original layers.
