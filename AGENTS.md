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

- Keep 3D generation lifecycle operations behind authenticated server functions; this preserves RLS ownership checks and keeps provider credentials server-side.
- Treat model versions as immutable originals with separately optimized review copies; this preserves rollback and prevents failed regeneration from replacing an approved model.
