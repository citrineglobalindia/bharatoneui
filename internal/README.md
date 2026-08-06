# internal/

Files that must **not** be published.

Everything in `public/` is copied verbatim to the CDN and served to anyone who
knows the URL. This folder is outside that, so nothing here is built, bundled or
deployed. It is version-controlled so the files are not lost.

## status-board.html

The planning and status board. It used to live at `public/status/index.html`
and was reachable at `mybharatone.com/status`.

It carried a username-and-password box, but that box could not protect anything:
the file is 13 MB with 122 embedded screenshots of every internal portal, and
the CDN delivered all of it before a single line of login code ran. `unlock()`
in the browser console opened it; the password hash it compared against was
printed a few lines above in the same file.

It now lives in the private `internal-board` storage bucket, whose read policy
is `private.is_admin()`. The check happens on the server before any bytes are
sent, and since admin access requires the second factor, the board inherits MFA.

**To publish an updated board:** Admin portal → Status Board → Replace, and
choose this file. Do not put it back in `public/`.

The fake sign-in overlay has been stripped from this copy, along with the sign
out link whose handler went with it.

## status-activity.html, status-health.html

Earlier sub-pages of the board. They were removed from git some time ago but
were still sitting in the working folder. Kept here in case the content is
wanted; they are not wired to anything.
