CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','vendor')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE menu_items (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT,
  price_paise INTEGER NOT NULL CHECK (price_paise > 0), available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','confirmed','preparing','ready','completed','cancelled')),
  total_paise INTEGER NOT NULL, payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','razorpay','mock')),
  razorpay_order_id TEXT UNIQUE, razorpay_payment_id TEXT, payment_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id), quantity INTEGER NOT NULL CHECK (quantity > 0), price_paise INTEGER NOT NULL
);

CREATE TABLE notification_tokens (
  id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token TEXT UNIQUE NOT NULL, platform TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_notification_tokens_user ON notification_tokens(user_id);
