create or replace function public.get_academy_stats(academy_id uuid, include_revenue boolean default true)
returns jsonb
language plpgsql
as $$
declare
  total_teachers int := 0;
  total_students int := 0;
  active_students int := 0;
  total_bookings int := 0;
  completed_bookings int := 0;
  cancelled_bookings int := 0;
  completion_rate numeric := 0;
  credits_balance numeric := 0;
  plans_active int := 0;
begin
  select count(*) into total_teachers
  from academy_teachers
  where academy_id = get_academy_stats.academy_id;

  select count(*),
         sum(case when status = 'active' then 1 else 0 end)
  into total_students, active_students
  from academy_students
  where academy_id = get_academy_stats.academy_id;

  select count(*) into total_bookings
  from bookings
  where academy_id = get_academy_stats.academy_id;

  select count(*) into completed_bookings
  from bookings
  where academy_id = get_academy_stats.academy_id
    and status_canonical = 'DONE';

  select count(*) into cancelled_bookings
  from bookings
  where academy_id = get_academy_stats.academy_id
    and status_canonical = 'CANCELED';

  if total_bookings > 0 then
    completion_rate := round((completed_bookings::numeric / total_bookings::numeric) * 100, 1);
  else
    completion_rate := 0;
  end if;

  return jsonb_build_object(
    'totalStudents', coalesce(total_students, 0),
    'activeStudents', coalesce(active_students, 0),
    'totalTeachers', coalesce(total_teachers, 0),
    'activeTeachers', coalesce(total_teachers, 0),
    'totalBookings', coalesce(total_bookings, 0),
    'completedBookings', coalesce(completed_bookings, 0),
    'cancelledBookings', coalesce(cancelled_bookings, 0),
    'completionRate', completion_rate,
    'creditsBalance', credits_balance,
    'plansActive', plans_active
  );
end;
$$;
