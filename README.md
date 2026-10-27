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

## Walls, doors and equipment

Apply `database/layout_objects.sql` on a database that does not yet have the
`warehouse_layout_objects` migration. The **Builder · Thành phần** / **Bố trí kho** controls open a component palette
beside the existing WebGL scene. No separate 2D canvas or modal is used. Choose
walls and drag endpoints directly on the 3D floor; choose doors, tables, machines
or floor areas and click the floor to place a preview. Existing objects can be
selected in the scene or by name. Drag their body or translation arrows to move,
use the rotation ring to turn, and use scale handles to resize width/depth/height.
Gizmo/body drags save on release. Numeric inspector fields preview immediately
and save through **Lưu thông số**. R rotates by 90 degrees; Escape cancels.
The camera stays in its current perspective while editing. Rack placement and
corner resizing remain available from the same palette. Door openings must be
left between wall segments; this version does not cut openings into walls.
Wall visibility and door open state are viewing controls, not persisted geometry.
No roof is modelled.

Layout rows inherit warehouse membership RLS. Owners/operators can write;
viewers can read. Updates/deletes check `updated_at`. Bounds are validated in
Postgres, including arbitrary rotations, and warehouse shrinking is blocked
when it would strand layout objects outside the floor. Workers avoid walls,
closed doors, tables and machines. Equipment models are schematic.

## Rack tiers

Apply `database/rack_shelf_count.sql` (`rack_shelf_count` migration). Existing
racks default to three tiers. Rack placement/drawing exposes total height and
**Số tầng kệ** (integer 1–20). The 3D preview, saved geometry, detail view and
cloning use the stored `shelf_count`. The builder's rack inspector edits these
values in place. Tier pitch is total height / tier count; the displayed pitch
excludes deduction for shelf thickness. Storage deck thickness is drawn within
each tier, and illustrative stock boxes stay inside its vertical clearance.

The component palette includes a movable/resizable trash bin after applying
`database/layout_bin.sql` (`layout_bin_component`). Rack labels in the 3D scene
include their saved tier counts.

## Delete a warehouse

Apply `database/delete_warehouse.sql` (`owner_delete_warehouse`). The warehouse
owner can use the trash icon beside the warehouse title, the **Tùy chọn kho**
menu beside its name in the sidebar, or **Xóa kho** in warehouse settings. The confirmation dialog requires the exact warehouse name. The RPC
rechecks owner identity, confirmation text and warehouse `updated_at`, acquires
the warehouse advisory lock and removes all warehouse records in one transaction.
It deletes inventory history as part of deleting the entire warehouse. No direct
DELETE table grants are added, and operators/viewers cannot use the RPC. This
is permanent deletion, not archive or undo. Deleting the selected warehouse
switches to another accessible warehouse or shows the create-warehouse state.

## Mobile QR camera and warehouse names

The QR modal requests `getUserMedia` independently of native BarcodeDetector
support. Native QR detection is optional; `jsqr` 1.4.0 loads on demand as a
pixel decoder for Safari/iOS and other browsers without the API. Video uses
muted inline playback and an ideal rear-camera preference. Closing the scanner,
hiding the document or reading a code stops tracks; pending permission results
are released if the scanner was closed. Permission/device errors are shown
separately. A photo input offers QR decoding without a live camera stream.
Camera use still requires HTTPS and permission granted by the actual device.

The owner can use the pencil icon beside the warehouse title or select **Đổi tên kho** from its sidebar title menu. It uses the existing
owner-only, version-checked warehouse update RPC with unchanged dimensions.

## Live 3D stock

Stock symbols come from positive `stock_balances` joined to products. Colours
are stable per product ID, boxes are labelled ×N, and hover/click shows the SKU
and exact quantity. Small quantities use one symbol per unit; larger quantities
are grouped into a bounded number of symbols, preserving exact per-SKU totals.
With detailed locations the budget is split by occupied slot (at least two
symbols per occupied slot, including a possible overflow group).
An overflow symbol represents additional SKUs when a rack has more than 180.
Empty racks draw no stock. Detailed stock uses recorded tiers/bins; unassigned
stock is listed separately. Symbol sizes are illustrative because packaging
dimensions are not stored. Inventory updates rebuild the symbols with the normal refresh cycle.
Warehouse rename/delete actions sit next to the warehouse title; ownership and
existing confirmation/version checks remain enforced.

## Mobile 3D layout

Below 768px, secondary scene actions are under **Công cụ**, components use a
horizontal scrolling palette and **Thông số** toggles the inspector. Expanded
mode fills the dynamic viewport, respects safe areas and locks background scroll.
Camera resizing preserves its angle/zoom while adjusting framing for portrait
aspect ratios. The canvas handles touch gestures; page scrolling remains outside
it. Summary cards scroll horizontally on the map view to preserve canvas space.

## Voice product search

**Tìm bằng giọng nói** opens warehouse-scoped, paginated results. Speech uses
optional native SpeechRecognition/webkitSpeechRecognition (`vi-VN`), starts only
on a button click, stops after one final transcript or 15 seconds and aborts on
close. Unsupported browsers and permission/network failures retain text search.
The browser provider may process audio remotely; the UI explains this before use.
Accent-insensitive matching preserves duplicate names and displays SKU, current
quantity/unit and rack links. No product is selected automatically. This feature
only reads the already-authorized warehouse snapshot and never changes inventory.

## Rack → tier → bin inventory

Apply `supabase/migrations/20261027080210_stock_locations.sql` and
`supabase/migrations/20261027080825_stock_location_fk_indexes.sql` after the existing
`database/` migrations. Each rack has 1–20 tiers and 1–20 equal-width bins per
tier (`bins_per_shelf`, default 1). Tier 01 is the lowest deck; bin 01 starts
at local left when facing the rack's front (+local Z), and follows rack rotation.
Location labels use the rack code plus `-T01-O01`; stable UUIDs are used in the
ledger, so renaming/moving a rack does not detach its stock.

`stock_locations` and `location_balances` are member-readable under RLS with no
direct client write grants. Rack insert/configuration creates slots atomically;
removing occupied tiers/bins is blocked on the server. Empty inactive slots stay
in the database for immutable history and reuse their UUID on re-expansion.
`record_location_movement` checks warehouse/write membership, active positions,
source quantity, request idempotency and same-position transfers. It serializes
with existing warehouse inventory/layout writes and updates detailed balances,
rack aggregates and immutable history in one transaction. Same-rack transfers
between different positions are allowed. Existing `record_movement` clients can
only move the unassigned bucket; they cannot silently consume allocated stock.

Migration assigns all preexisting quantities and historical rack references to
an explicit **Chưa phân ô** bucket. It does not invent historical tier/bin data.
New UI receipts require a real tier/bin; old stock can be allocated through
**Phân ô hàng cũ** or **Chuyển vị trí**, including within the same rack.
Product detail, inventory table, movement history and voice search show full
location labels. **Xem 3D** and the rack position selector highlight the chosen
slot. Spatial stock meshes stay inside their recorded tier/bin; unassigned stock
is listed/warned but not rendered on an invented shelf. Package sizes remain
illustrative and do not represent capacity/load certification.

`npm test` covers active slot filtering, quantity conservation and mesh bounds.
`tests/locations.integration.sql` uses a rolled-back disposable warehouse to
verify allocation, same/cross-rack transfer, retries, rejected overdraw, occupied
slot guards, inactive slots, stable IDs, permissions/RLS and whole-warehouse
deletion. It requires an SQL admin and an existing warehouse owner; it must not
be run as an ordinary frontend query. Browser verification uses a disposable
warehouse and deletes it after the check.
