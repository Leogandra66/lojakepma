# Project Architecture

- The representative catalogue is a protected B2B module backed by dedicated clients, terms, orders and transactional approval RPCs; this isolates wholesale operations from the B2C cart and payments.
- Bling synchronization writes sale prices only to `products.price_b2b`; `products.price` is B2C-managed and must never be changed by Bling.
- Public B2C product queries must explicitly select public columns and never request `price_b2b`; this prevents B2B pricing permissions from affecting the storefront.
- B2B clients require complete tax, contact and address data except address complement; legacy rows remain nullable until edited, and state is restricted to a valid Brazilian UF.
- Representative self-registration always creates a pending B2B account; only the separate admin role can approve access, and representatives never receive admin privileges.
- B2B order pricing is derived server-side from the selected client's state: MG uses `price_b2b`, other states receive 14% off, and a missing state blocks ordering; this preserves trustworthy item price snapshots.
- B2B catalogue search and category filtering run client-side before six-item pagination so product selection remains intact across pages.
- B2B order PDFs are generated locally from saved order snapshots; no external document service or recalculation of historical prices is allowed.