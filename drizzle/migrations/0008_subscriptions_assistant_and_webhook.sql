-- Manual access is preserved for client accounts without any subscription.
CREATE OR REPLACE FUNCTION public.has_subscription_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.has_staff_read_access(_user_id) OR NOT EXISTS (
    SELECT 1 FROM public.subscriptions WHERE user_id=_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.user_id=_user_id
      AND s.status IN ('active','trial')
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
      AND (s.stripe_subscription_id IS NULL OR s.environment='production')
  )
$$;
REVOKE ALL ON FUNCTION public.has_subscription_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_subscription_access(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.has_operational_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.profiles p WHERE p.user_id=_user_id
   AND p.is_active AND NOT p.must_change_password
   AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p.user_id)
 ) AND public.has_subscription_access(_user_id)
$$;
CREATE FUNCTION public.get_my_operational_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_operational_access(auth.uid())
$$;
REVOKE ALL ON FUNCTION public.get_my_operational_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_operational_access() TO authenticated;

-- Only the server can produce trusted assistant telemetry.
REVOKE INSERT, UPDATE ON public.regina_interactions FROM authenticated, anon;
ALTER TABLE public.regina_interactions
 ADD COLUMN input_tokens integer,
 ADD COLUMN output_tokens integer;
CREATE INDEX regina_interactions_user_time_idx ON public.regina_interactions(user_id,created_at);
CREATE FUNCTION public.reserve_regina_interaction(_user_id uuid,_question text,_topic text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid;
BEGIN
 IF NOT public.has_operational_access(_user_id) THEN
   RAISE EXCEPTION 'Operational access denied' USING ERRCODE='42501';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text, 0));
 IF (SELECT count(*) FROM public.regina_interactions WHERE user_id=_user_id AND created_at>=now()-interval '1 minute')>=10
 OR (SELECT count(*) FROM public.regina_interactions WHERE user_id=_user_id AND created_at>=date_trunc('day',now()))>=100 THEN
   RAISE EXCEPTION 'Assistant quota exceeded' USING ERRCODE='P0429';
 END IF;
 INSERT INTO public.regina_interactions(user_id,question,topic,origin)
 VALUES(_user_id,left(_question,2000),left(_topic,40),'chat') RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.reserve_regina_interaction(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_regina_interaction(uuid,text,text) TO service_role;

-- A lease makes crashed webhook attempts recoverable without concurrent processing.
ALTER TABLE public.payment_events ADD COLUMN processing_token uuid, ADD COLUMN lease_until timestamptz;
CREATE FUNCTION public.claim_payment_event(_event_id text,_event_type text,_environment text,_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE token uuid; state text;
BEGIN
 INSERT INTO public.payment_events(event_id,event_type,environment,payload,status)
 VALUES(_event_id,_event_type,_environment,_payload,'pendente') ON CONFLICT(event_id) DO NOTHING;
 UPDATE public.payment_events
 SET status='pendente',error=NULL,attempts=attempts+1,processing_token=gen_random_uuid(),lease_until=now()+interval '5 minutes'
 WHERE event_id=_event_id AND (status='falha' OR (status='pendente' AND (lease_until IS NULL OR lease_until<now())))
 RETURNING processing_token INTO token;
 SELECT status INTO state FROM public.payment_events WHERE event_id=_event_id;
 RETURN jsonb_build_object('token',token,'status',state);
END $$;
REVOKE ALL ON FUNCTION public.claim_payment_event(text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_event(text,text,text,jsonb) TO service_role;

CREATE FUNCTION public.get_admin_dashboard() RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE response jsonb;
BEGIN
 IF NOT public.has_staff_read_access(auth.uid()) OR NOT public.has_operational_access(auth.uid()) THEN
  RAISE EXCEPTION 'Staff access required' USING ERRCODE='42501';
 END IF;
 WITH clients AS (
  SELECT p.* FROM public.profiles p WHERE public.has_role(p.user_id,'client') AND NOT public.has_staff_read_access(p.user_id)
 ), weeks AS (
  SELECT generate_series(
   (date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')-interval '7 weeks',
   date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo',
   interval '1 week'
  ) AS start
 )
 SELECT jsonb_build_object(
  'totalClients',(SELECT count(*) FROM clients),
  'activeClients',(SELECT count(*) FROM clients WHERE is_active),
  'inactiveClients',(SELECT count(*) FROM clients WHERE NOT is_active),
  'totalCalcs',(SELECT count(*) FROM public.calculations),
  'activeSubs',(SELECT count(*) FROM public.subscriptions s JOIN clients p ON s.user_id=p.user_id WHERE s.status='active' AND public.has_subscription_access(s.user_id)),
  'trialSubs',(SELECT count(*) FROM public.subscriptions s JOIN clients p ON s.user_id=p.user_id WHERE s.status='trial' AND public.has_subscription_access(s.user_id)),
  'recentCalcs',coalesce((SELECT jsonb_agg(r) FROM (
    SELECT coalesce(p.company_name,p.full_name,'—') AS client,c.data,c.situacao,c.created_at
    FROM public.calculations c LEFT JOIN public.profiles p ON p.user_id=c.user_id
    ORDER BY c.created_at DESC,c.id DESC LIMIT 8
  ) r),'[]'::jsonb),
  'weeklyData',coalesce((SELECT jsonb_agg(w ORDER BY w.start) FROM (
    SELECT start,to_char(start AT TIME ZONE 'America/Sao_Paulo','DD/MM') AS week,
      (SELECT count(*) FROM public.calculations WHERE created_at>=start AND created_at<start+interval '1 week') AS count
    FROM weeks
  ) w),'[]'::jsonb)
 ) INTO response;
 RETURN response;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_dashboard() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard() TO authenticated;
