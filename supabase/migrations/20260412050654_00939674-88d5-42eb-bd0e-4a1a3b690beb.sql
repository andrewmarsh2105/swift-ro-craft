
CREATE OR REPLACE FUNCTION public.replace_ro_lines(
  _ro_id uuid,
  _lines jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _count integer;
BEGIN
  -- Verify the caller owns the RO
  IF NOT EXISTS (SELECT 1 FROM public.ros WHERE id = _ro_id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'RO not found or access denied';
  END IF;

  -- Delete all existing lines for this RO (owned by this user)
  DELETE FROM public.ro_lines WHERE ro_id = _ro_id AND user_id = _user_id;

  -- Insert new lines from the JSON array
  IF jsonb_array_length(_lines) > 0 THEN
    INSERT INTO public.ro_lines (
      ro_id, user_id, line_no, description, labor_type,
      hours_paid, is_tbd, matched_reference_id,
      vehicle_override, line_vehicle_year, line_vehicle_make,
      line_vehicle_model, line_vehicle_trim
    )
    SELECT
      _ro_id,
      _user_id,
      (elem->>'line_no')::integer,
      COALESCE(elem->>'description', ''),
      COALESCE((elem->>'labor_type')::labor_type, 'customer-pay'),
      COALESCE((elem->>'hours_paid')::numeric, 0),
      COALESCE((elem->>'is_tbd')::boolean, false),
      CASE WHEN elem->>'matched_reference_id' IS NOT NULL AND elem->>'matched_reference_id' != ''
           THEN (elem->>'matched_reference_id')::uuid ELSE NULL END,
      COALESCE((elem->>'vehicle_override')::boolean, false),
      (elem->>'line_vehicle_year')::smallint,
      elem->>'line_vehicle_make',
      elem->>'line_vehicle_model',
      elem->>'line_vehicle_trim'
    FROM jsonb_array_elements(_lines) AS elem;
  END IF;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;
