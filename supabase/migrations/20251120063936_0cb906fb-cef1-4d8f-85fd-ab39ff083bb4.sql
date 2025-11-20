-- Crear tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Crear tabla de Banks (casas de apuesta)
CREATE TABLE public.banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  initial_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS para banks
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

-- Políticas para banks
CREATE POLICY "Users can view their own banks"
  ON public.banks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own banks"
  ON public.banks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own banks"
  ON public.banks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own banks"
  ON public.banks FOR DELETE
  USING (auth.uid() = user_id);

-- Crear tipo enum para resultado de apuesta
CREATE TYPE bet_status AS ENUM ('won', 'lost', 'open');

-- Crear tabla de apuestas
CREATE TABLE public.bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  odds DECIMAL(10,2) NOT NULL,
  status bet_status NOT NULL DEFAULT 'open',
  bet_type TEXT NOT NULL DEFAULT 'simple',
  description TEXT,
  profit DECIMAL(10,2),
  bet_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS para bets
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- Políticas para bets
CREATE POLICY "Users can view their own bets"
  ON public.bets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bets"
  ON public.bets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bets"
  ON public.bets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bets"
  ON public.bets FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para actualizar el balance del bank
CREATE OR REPLACE FUNCTION public.update_bank_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Calcular profit basado en el estado
  IF NEW.status = 'won' THEN
    NEW.profit = NEW.amount * NEW.odds - NEW.amount;
  ELSIF NEW.status = 'lost' THEN
    NEW.profit = -NEW.amount;
  ELSE
    NEW.profit = 0;
  END IF;

  -- Actualizar balance del bank
  UPDATE public.banks
  SET current_balance = initial_balance + (
    SELECT COALESCE(SUM(profit), 0)
    FROM public.bets
    WHERE bank_id = NEW.bank_id AND status != 'open'
  ),
  updated_at = NOW()
  WHERE id = NEW.bank_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_bet_profit
  BEFORE INSERT OR UPDATE ON public.bets
  FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_banks_updated_at
  BEFORE UPDATE ON public.banks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bets_updated_at
  BEFORE UPDATE ON public.bets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();