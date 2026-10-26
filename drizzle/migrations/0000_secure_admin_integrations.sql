CREATE TABLE public.forge_admin (id text PRIMARY KEY DEFAULT 'admin' CHECK(id = 'admin'), password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.forge_admin TO service_role;
ALTER TABLE public.forge_admin ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.forge_admin_profile (id text PRIMARY KEY REFERENCES public.forge_admin(id) ON DELETE CASCADE, display_name text NOT NULL DEFAULT 'Administrator', preferences jsonb NOT NULL DEFAULT '{}');
GRANT ALL ON public.forge_admin_profile TO service_role;
ALTER TABLE public.forge_admin_profile ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.forge_integrations (id text PRIMARY KEY CHECK(id IN ('anilist','jikan','tmdb','omdb')), enabled boolean NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.forge_integrations TO service_role;
ALTER TABLE public.forge_integrations ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.forge_login_limits (id text PRIMARY KEY, attempts integer NOT NULL DEFAULT 0, window_start timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.forge_login_limits TO service_role;
ALTER TABLE public.forge_login_limits ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.forge_consume_login(bucket text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
INSERT INTO forge_login_limits(id, attempts) VALUES(bucket,1) ON CONFLICT(id) DO UPDATE SET attempts = CASE WHEN forge_login_limits.window_start < now() - interval '15 minutes' THEN 1 ELSE forge_login_limits.attempts + 1 END, window_start = CASE WHEN forge_login_limits.window_start < now() - interval '15 minutes' THEN now() ELSE forge_login_limits.window_start END RETURNING attempts INTO n;
RETURN n <= 5;
END; $$;
REVOKE ALL ON FUNCTION public.forge_consume_login(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.forge_consume_login(text) TO service_role;