-- ============================================
-- إصلاح الصلاحيات — الصق ده في SQL Editor
-- ============================================

-- حذف كل الـ policies الموجودة
do $$ 
declare
  pol record;
begin
  for pol in 
    select policyname, tablename 
    from pg_policies 
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- إنشاء policies جديدة
create policy "allow_all_users"    on users            for all using (true) with check (true);
create policy "allow_all_shipping" on shipping_options for all using (true) with check (true);
create policy "allow_all_products" on products         for all using (true) with check (true);
create policy "allow_all_orders"   on orders           for all using (true) with check (true);
create policy "allow_all_settings" on settings         for all using (true) with check (true);

-- منح الصلاحيات للـ anon role
grant usage on schema public to anon;
grant select, insert, update, delete on users            to anon;
grant select, insert, update, delete on shipping_options to anon;
grant select, insert, update, delete on products         to anon;
grant select, insert, update, delete on orders           to anon;
grant select, insert, update, delete on settings         to anon;
grant usage on all sequences in schema public to anon;
