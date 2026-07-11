
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.order_status AS ENUM ('pending','paid','active','expired','refunded','chargeback','failed');
CREATE TYPE public.delivery_type AS ENUM ('rust_command','discord_role');
CREATE TYPE public.delivery_action AS ENUM ('add','remove');
CREATE TYPE public.delivery_status AS ENUM ('pending','success','failed');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  steam_id TEXT UNIQUE,
  steam_name TEXT,
  discord_id TEXT,
  discord_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ PROFILE POLICIES (after has_role exists) ============
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ PACKAGES ============
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price_eur NUMERIC(10,2) NOT NULL,
  duration_days INTEGER,
  image_url TEXT,
  description TEXT,
  short_description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  rust_command_add TEXT,
  rust_command_remove TEXT,
  discord_role_key TEXT,
  tier TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.packages TO anon, authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages_public_read" ON public.packages FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "packages_admin_write" ON public.packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id),
  steam_id TEXT,
  discord_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT UNIQUE,
  amount_paid NUMERIC(10,2),
  currency TEXT DEFAULT 'EUR',
  status public.order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status_expires ON public.orders(status, expires_at);

-- ============ DELIVERIES ============
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  type public.delivery_type NOT NULL,
  action public.delivery_action NOT NULL,
  target TEXT,
  command TEXT,
  status public.delivery_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ
);
GRANT SELECT ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries_select_own" ON public.deliveries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "deliveries_admin_all" ON public.deliveries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ ADMIN LOGS ============
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_logs_admin_all" ON public.admin_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ AUTO PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEED PACKAGES ============
INSERT INTO public.packages (name, slug, price_eur, duration_days, description, short_description, features, rust_command_add, rust_command_remove, discord_role_key, tier, sort_order) VALUES
('Queue Priority','queue-priority',10.00,30,
 'Skip the waiting line and join Rust Cobalt EU faster during busy hours. Queue Priority is perfect for players who want quick access when the server is full.',
 'Skip the queue during busy hours.',
 '["Queue Priority access","Valid for 30 days","No gameplay advantage","No kits, no boosts, no pay-to-win"]'::jsonb,
 'cobalt.vipranks.queue.add {STEAMID64} 30','cobalt.vipranks.queue.remove {STEAMID64} expired','queue_priority','queue',1),
('VIP','vip',10.00,30,
 'Support Rust Cobalt EU and unlock cosmetic SkinBox access. VIP gives you access to cosmetic skins and in-game event alerts without gaining any gameplay advantage.',
 'Cosmetic SkinBox + in-game event alerts.',
 '["SkinBox access","VIP chat prefix","In-game event alerts: Cargo Ship, Oil Rig, Locked Crates, Patrol Heli, Bradley APC, Airdrops, Chinook Crates, Deep Sea Events","VIP Discord role","Valid for 30 days","No kits, no gather boosts, no combat advantage"]'::jsonb,
 'cobalt.vipranks.vip.add {STEAMID64} 30','cobalt.vipranks.vip.remove {STEAMID64} expired','vip','vip',2),
('VIP+','vip-plus',20.00,30,
 'The full VIP package for players who want all cosmetic and quality-of-life perks. VIP+ includes Queue Priority, SkinBox access, TeamSkinBox access and premium in-game event alerts.',
 'All cosmetic + QoL perks. Best value.',
 '["Queue Priority","SkinBox access","TeamSkinBox access","VIP+ chat prefix","Premium in-game event alerts","VIP+ Discord role","Valid for 30 days","Best value package","No kits, no gather boosts, no combat advantage"]'::jsonb,
 'cobalt.vipranks.vipplus.add {STEAMID64} 30','cobalt.vipranks.vipplus.remove {STEAMID64} expired','vipplus','vipplus',3),
('Support the Server','support',5.00,NULL,
 'Want to support Rust Cobalt EU without buying a VIP package? Choose your own amount and help us cover server hosting, plugins, development, maintenance and anti-cheat tools.',
 'Voluntary donation. No in-game perks.',
 '["Custom donation amount","Supporter Discord role","Thank you from the Rust Cobalt EU team","No in-game advantage","No VIP perks","No pay-to-win"]'::jsonb,
 NULL,NULL,'supporter','support',4);
