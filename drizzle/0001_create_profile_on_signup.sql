-- Custom SQL migration file, put your code below! --

-- Every new Supabase Auth user gets a profile row, so the two tables can't drift apart.
-- security definer: the trigger runs as the function owner, since the signing-up user
-- has no permission to insert into profiles themselves.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
--> statement-breakpoint

-- Only the trigger should call this; don't expose it through Supabase's public API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
--> statement-breakpoint

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
