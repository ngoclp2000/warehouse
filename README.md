# KhoSpace

React + Mantine 9.7.4 + Vite, Three.js 0.186.1, Supabase JS 2.118.0.

## Run

`npm ci` then `npm run dev`. Production: `npm run build`.
Copy `.env.example` to `.env` and set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before running or building. Never use a service-role key in the frontend. Run `npm test` for geometry/navigation unit tests.

## Data model

Warehouse membership controls access. Each product has one SKU per warehouse and may have stock at multiple racks. `stock_balances` is read-only for API clients. Immutable stock movements are created through `record_movement`, which checks access, locks warehouse inventory, validates available stock, updates balances, and inserts history in one transaction. Request UUIDs make retries idempotent. UUID product links keep QR references stable after a SKU change.

All seven exposed tables have RLS. Private security-definer routines use an empty search_path and explicit auth checks. Authenticated clients can create/edit permitted product, category, and rack fields; cannot rewrite balances, movements, membership, or warehouse ownership. No anonymous access is granted.

The SQL snapshot is `database/schema.sql`. Applied cloud migrations: `khospace_inventory_foundation`, `index_balance_product_warehouse`. Do not run the snapshot over an existing database; use a new reviewed migration for subsequent changes.

## UI

Mantine AppShell, Modal, form inputs, tables, pagination, alerts, notifications and design tokens provide a consistent responsive interface. Three.js loads separately from the initial application. Stock refreshes every 20 seconds while visible, and on window focus. Write actions refresh immediately. Editing product/rack records uses updated_at to detect conflicts. Dragging uses a 0.5 m snap; the UI rejects overlapping racks. The database enforces rack bounds. Capacity is a conventional unit count, not a structural-load or volume calculation.

## Auth setup

Use your own Supabase project. On a new database apply database/schema.sql, then database/warehouse_resize.sql.
Set Supabase Auth Site URL and Redirect URLs to your deployment domain.

Email/password sign-in is separate from the hosting site's ChatGPT access gate. Sign up, verify the email, and create the first empty warehouse. Old browser-local prototype data is not imported automatically. Existing QA data is temporary and is cleaned after verification.

Default Supabase email delivery is restricted to project-team email addresses. Set up custom SMTP in Auth > Emails > SMTP Settings before inviting users outside the project team. Do not disable email confirmation to work around delivery restrictions. Password leak protection may require an eligible Supabase plan; review the Auth advisor before wider rollout.

## Verification

- Actual Supabase login, REST insert/select, warehouse/rack/product creation and incoming stock through UI.
- SQL transaction tests: overdraw rejected; transfer preserves total; repeated request creates one movement; direct balance mutation denied; rack outside bounds rejected; second user cannot read or mutate the first warehouse. Test rows rolled back.
- Authenticated REST concurrent requests: two withdrawals of 20 from stock 24 result in one success, one rejection, stock 4.
- Anonymous REST read rejected.
- QR lookup; print preview verifies 2 products × 2 copies = 4 rendered labels. Native print dialog opened; physical print and real camera scan were not tested.
- Production build and responsive mobile/desktop navigation checked. No RLS advisor findings. Performance advisor has only expected unused-index information on the new database. Auth advisor flags disabled leaked-password protection.

`tests/integration.mjs` is a guarded one-time QA script and requires an explicitly prepared disposable account/warehouse; it is not a general production test command.

## References

- https://mantine.dev/getting-started/
- https://mantine.dev/core/app-shell/
- https://ui.shadcn.com/docs/installation/vite
- https://ui.shadcn.com/docs/components/base/data-table
- https://ant.design/docs/react/introduce/
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Direct 3D layout editor

Open the 3D map and choose **Bố trí kho** or **Thêm kệ hàng**. Preset placement and drawing tools create racks directly on the floor; codes are generated per zone. Move mode drags existing racks with a 0.5 m snap. Resize mode exposes four corner handles with a fixed opposite corner; existing stock assignments remain attached to the same rack UUID. Rotate turns by 90 degrees. Duplicate copies layout dimensions/capacity into a new empty rack. Expanded mode provides a larger editing canvas. Each successful action persists immediately through authenticated Supabase requests, with updated_at conflict detection for updates. Invalid overlaps or out-of-bounds previews are rejected.

Geometry validation: `node --test tests/geometry.test.mjs` (5 tests). Browser checks with a temporary account verified click-to-place, rectangle drawing, rotation, duplication, corner resize, valid movement, overlap rejection and expanded view. SQL readback verified actual saved geometry. Temporary QA rows and account are removed after verification.

## Warehouse dimensions and decorative worker

The owner can change warehouse name, width and depth from **Kích thước kho** in the 3D toolbar. Coordinates remain centered. The server rejects shrinking past any existing rack, rejects stale updated_at versions, and serializes warehouse resizing with rack geometry writes using the same advisory lock. Warehouse dimensions refresh across clients with the normal polling cycle. Applied SQL is in `database/warehouse_resize.sql` (`warehouse_resize_guard`).

A decorative worker appears automatically in the 3D scene. It chooses random reachable destinations and walks around rack footprints with animated arms/legs. It has no keyboard controls, camera-follow mode, stock checks or data mutations. Motion is paused while a modal is open or the document is hidden; reduced-motion preferences display a stationary worker. Routes use a bounded A* search and reroute when rack geometry changes.

Verified: 11 geometry/navigation/animation tests; SQL checks for expand, blocked shrink, stale writes and owner-only changes; browser form save and actual persisted dimensions; concurrent shrink vs. incompatible rack move; visible automatic movement in the browser. `tests/warehouse-concurrency.mjs` only accepts the disposable QA account and is not a production test command.
