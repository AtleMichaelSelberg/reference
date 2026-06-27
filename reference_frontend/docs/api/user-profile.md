# API Reference

---

# GET /api/users/candidates/

Returns a flat list of all user IDs in the system. Use this to get the pool of users to fetch profiles for.

## Authentication

Required. Pass a JWT access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Response — `200 OK`

```json
{
  "user_ids": [1, 2, 3, 16, 17]
}
```

## Error responses

| Status | When |
|--------|------|
| `401 Unauthorized` | Missing or invalid/expired token |

## Example call

```js
const res = await fetch('/api/users/candidates/', {
  headers: { Authorization: `Bearer ${accessToken}` }
});
const { user_ids } = await res.json();
```

---

# GET /api/users/<id>/profile/

Returns a user's public profile and all endorsements they are involved in, with full user data on both sides of each endorsement.

---

## Authentication

Required. Pass a JWT access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Obtain a token via `POST /api/users/login/` with `{ "email": "...", "password": "..." }`. The response contains `access` and `refresh` fields.

---

## URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | The primary key of the user to fetch |

---

## Response — `200 OK`

```jsonc
{
  "user": {
    "id": 16,
    "first_name": "Jon",
    "last_name": "Snow",
    "bio": "Lord Commander of the Night's Watch...",
    "profile_pictures": [
      {
        "id": 1,
        "order": 0,           // pictures are ordered lowest-first
        "is_primary": true,
        "image_data": "<base64-encoded bytes, or null>",
        "image_url": ""       // external URL, or empty string
      }
    ],
    "can_try_to_kill": false,   // whether the UI should show a KILL action for this user
    "is_unkillable": false      // if true, kill attempts always fail (show toast, don't advance)
  },
  "endorsements": [
    {
      "id": 1,
      "endorsement_type": "romantic",   // "romantic" | "platonic"
      "is_romantic": true,              // derived boolean, same info as above
      "is_joining_endorsement": true,

      "first_user": { /* same UserSummary shape as above */ },
      "second_user": { /* same UserSummary shape as above */ },

      "first_user_approved": true,
      "second_user_approved": true,
      "first_user_statement": "She is the most remarkable person...",
      "second_user_statement": "He is the shields that guard...",
      "first_user_did_approve_text": true,
      "second_user_did_approve_text": true,

      "created_at": "2026-06-26T15:00:00Z",
      "updated_at": "2026-06-26T15:00:00Z"
    }
  ]
}
```

---

## Field notes

**`user.profile_pictures`**
- Sorted by `order` ascending. The primary picture (`is_primary: true`) is not guaranteed to be `order: 0` — filter for `is_primary` to find it.
- `image_data` is a base64-encoded string of raw image bytes. Decode it to render the image directly without a second network request. Will be `null` if not set.
- `image_url` is a plain URL string. Empty string `""` if not set.
- A picture will always have at least one of `image_data` or `image_url`.

**`user.can_try_to_kill`** / **`user.is_unkillable`**
- `can_try_to_kill: true` means the KILL button should be shown for this profile.
- `is_unkillable: true` means a kill attempt should fail with a toast — do not advance. Both fields default to `false`.

**`endorsements`**
- The requested user appears as either `first_user` or `second_user` — there is no guaranteed slot. To find the "other" person in each endorsement, check which of `first_user.id` / `second_user.id` matches the `id` you requested.
- `endorsement_type` is the source of truth for romantic vs platonic. `is_romantic` is a convenience boolean derived from it.
- Statements and approval flags can be populated independently. Check `first_user_approved` / `second_user_approved` to know if both parties have accepted the endorsement before displaying it publicly.

---

## Error responses

| Status | When |
|--------|------|
| `401 Unauthorized` | Missing or invalid/expired token |
| `404 Not Found` | No user exists with that `id` |

---

## Example call (fetch + render primary picture)

```js
const res = await fetch(`/api/users/${userId}/profile/`, {
  headers: { Authorization: `Bearer ${accessToken}` }
});
const { user, endorsements } = await res.json();

const primary = user.profile_pictures.find(p => p.is_primary);
const imgSrc = primary.image_data
  ? `data:image/jpeg;base64,${primary.image_data}`
  : primary.image_url;

const others = endorsements.map(e =>
  e.first_user.id === userId ? e.second_user : e.first_user
);
```
