# Shri Sitaram Seva Trust — Room Category Copy (listing + marketing)

Property: **Shri Sitaram Seva Trust**, Luvkush Nagar, Ramghat, Ayodhya
Live rows created by `044_ayodhya01_sitaram_seva_seed.sql` (hotel_rooms).
`room_type` values are the LIVE CHECK-constraint values — do not invent new
ones (see `ROOM_TYPE_VALUES` in `src/lib/repositories/room-type.repository.ts`).

## Standard table

| room_name (DB) | room_type | Base ₹/night | Sleeps | bed_type |
|---|---|---|---|---|
| Standard Double Bedroom | `double` | **999** | 2 adults | 1 Double Bed |
| Sweet Room (Premium Double Bed) | `suite` | **1199** | 2 + 1 child | 1 Premium Double Bed |
| 3-Bed Family Room | `family` | **1499** `[CONFIRM]` | 3 (+1) | 3 Beds (combination) |
| 4-Bed Family Room | `family` | **1799** `[CONFIRM]` | 4 (+1) | 4 Beds (combination) |
| 5-Bed Family Room | `family` | **1999** `[CONFIRM]` | 5 (+1) | 5 Beds (combination) |

Policies (apply to all): check-in 12:00, check-out 11:00, free cancellation
24h before check-in `[CONFIRM]`, photo ID required for every guest `[CONFIRM]`,
extra mattress ₹200/night `[CONFIRM]`.

## Listing descriptions (public pages, social, OTA copies)

**Standard Double Bedroom**
> A clean, quiet double room with an attached bathroom — a two-minute walk from
> Ramghat. Built for early-morning Mangala Aarti darshan: 24×7 hot water, fresh
> linen, and a peaceful night's sleep.

**Sweet Room (Premium Double Bed)**
> Our premium stay: a larger room with an upgraded double bed, a seating corner
> and premium linen. Warm lighting and a call courtyard view — a comfortable,
> private base for your Ayodhya pilgrimage.

**3-Bed Family Room**
> Three comfortable beds in one room — made for parents with grown children on
> darshan. Attached bathroom, 24×7 hot water and room to keep the luggage out
> of the way.

**4-Bed Family Room**
> Four beds with generous floor space: joint families and two couples can stay
> together instead of splitting across rooms. Steps from Ramghat, ideal for a
> Ram Mandir long weekend.

**5-Bed Family Room**
> Our largest room — five beds for a full family pilgrimage. Everyone under one
> roof, walking distance to Ramghat and the Ram Mandir darshan route.

Short slug lines (cards/thumbs):
- Standard: "Rooms from ₹999 · 2 min to Ramghat 🙏"
- Sweet: "Premium double · from ₹1199 · courtyard quiet"
- Family 3/4/5: "3/4/5 beds — full family, one room"

## SEO slugs used

- Property: `/hotels/shri-sitaram-seva-trust` (title/meta auto-built from the
  hotel row — description seeded by `044`)
- Destination hub: `/destinations/ayodhya-ram-mandir` (row seeded by `044`;
  photos upload from Admin → Destinations → Images)

## Before publishing
1. `[CONFIRM]` prices for 3/4/5-bed rooms + room stock counts (owner).
2. `[CONFIRM]` cancellation window, extra-mattress fee, breakfast inclusion.
3. Hero photo shoot — use the `growth-chalfirr` Design prompts; photos must be
   uploaded to the hotel row (thumbnail) and destination_images (hub page).