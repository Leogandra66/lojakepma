# Project Architecture

- The representative catalogue is a protected B2B module backed by dedicated clients, terms, orders and transactional approval RPCs; this isolates wholesale operations from the B2C cart and payments.
- Bling synchronization writes sale prices only to `products.price_b2b`; `products.price` is B2C-managed and must never be changed by Bling.
- Public B2C product queries must explicitly select public columns and never request `price_b2b`; this prevents B2B pricing permissions from affecting the storefront.
- B2B client tax identity uses normalized, per-representative unique `cnpj` plus required `state_registration`; legacy rows remain nullable until edited.
- Representative self-registration always creates a pending B2B account; only the separate admin role can approve access, and representatives never receive admin privileges.