create table if not exists public.room_images (
  id uuid primary key default gen_random_uuid(),

  room_type_id uuid not null
    references public.room_types(id)
    on delete cascade,

  storage_path text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists room_images_room_type_id_idx
  on public.room_images(room_type_id);
