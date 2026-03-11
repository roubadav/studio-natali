-- Studio Natali - Seed Data

-- Kategorie služeb
INSERT OR IGNORE INTO service_categories (name, slug, icon, sort_order) VALUES
('Dámské', 'damske', 'Sparkles', 10),
('Pánské', 'panske', 'Scissors', 20),
('Dětské', 'detske', 'Heart', 30);

UPDATE service_categories
SET name = 'Dámské', icon = 'Sparkles', sort_order = 10, description = 'Střihy, mytí, regenerace, styling, barvení i melír.'
WHERE slug = 'damske';

UPDATE service_categories
SET name = 'Pánské', icon = 'Scissors', sort_order = 20, description = 'Klasické i moderní pánské střihy včetně strojku.'
WHERE slug = 'panske';

UPDATE service_categories
SET name = 'Dětské', icon = 'Heart', sort_order = 30, description = 'Šetrné střihy pro děti v klidném prostředí.'
WHERE slug = 'detske';

-- Nastavení
INSERT OR IGNORE INTO settings (key, value, description, category) VALUES
('workflow_require_provider_approval', 'true', 'Vyžadovat schválení kadeřnicí', 'workflow'),
('workflow_send_sms', 'false', 'Odesílat SMS notifikace', 'workflow'),
('cancellation_hours_limit', '24', 'Kolik hodin předem lze zrušit', 'workflow'),
('contact_email', 'vilmastrakata@gmail.com', 'Hlavní email studia', 'general'),
('contact_phone', '+420 728 814 712', 'Hlavní telefon', 'general'),
('salon_name', 'Studio Natali', 'Název salonu', 'general'),
('address', 'Černokostelecká 80/42\nŘíčany u Prahy', 'Adresa salonu', 'general'),
('booking_window', '30', 'Počet dnů dopředu pro rezervaci', 'workflow'),
('require_email_verification', 'false', 'Vyžadovat ověření emailu', 'workflow'),
('sms_daily_limit', '20', 'Maximální počet SMS za den', 'workflow');

UPDATE settings SET value = 'vilmastrakata@gmail.com' WHERE key = 'contact_email';
UPDATE settings SET value = '+420 728 814 712' WHERE key = 'contact_phone';
UPDATE settings SET value = 'Studio Natali' WHERE key = 'salon_name';
UPDATE settings SET value = 'Černokostelecká 80/42\nŘíčany u Prahy' WHERE key = 'address';

-- Uživatelé (heslo je hashované - pro produkci změnit!)
-- Password: admin123 -> hash generován pomocí PBKDF2 (pro produkci změnit!)
INSERT OR IGNORE INTO users (email, password_hash, name, slug, role, bio, phone, image, color) VALUES
('admin0', 'pbkdf2:4G8VyW4_I6T66rwkwmesXg:_KFQXJfHU8xT6J1a86YdJYGM-Kc_qXrU8l3OqqzJGW8', 'Administrátor', 'admin', 'superadmin', 'Správce systému', '', '', '#000000'),
('vilmastrakata@gmail.com', 'pbkdf2:4G8VyW4_I6T66rwkwmesXg:_KFQXJfHU8xT6J1a86YdJYGM-Kc_qXrU8l3OqqzJGW8', 'Vilma Strakatá', 'vilma', 'user', 'Přirozené a udržitelné střihy, barvení a melír v klidném prostředí.', '+420 728 814 712', '/images/team/vilma.jpg', '#8b5cf6');

-- Oprava legacy účtů po migraci (bcrypt + starý login vilma0)
UPDATE users
SET password_hash = 'pbkdf2:4G8VyW4_I6T66rwkwmesXg:_KFQXJfHU8xT6J1a86YdJYGM-Kc_qXrU8l3OqqzJGW8'
WHERE email IN ('admin0', 'natali0', 'vilma0', 'info@studionatali-ricany.cz', 'vilmastrakata@gmail.com')
	AND (password_hash LIKE '$2a$%' OR password_hash LIKE '$2b$%');

UPDATE users
SET email = 'vilmastrakata@gmail.com'
WHERE slug = 'vilma' AND email IN ('vilma0', 'info@studionatali-ricany.cz');

UPDATE users
SET name = 'Vilma Strakatá',
    bio = 'Přirozené a udržitelné střihy, barvení a melír v klidném prostředí.',
    phone = '+420 728 814 712',
    image = '/images/team/vilma.jpg',
    role = 'user',
    is_active = 1
WHERE slug = 'vilma';

UPDATE users
SET is_active = 0
WHERE slug = 'natalie';

-- Pracovní doba pro Vilmu Strakatou (dynamické user_id podle slugu)
INSERT OR IGNORE INTO working_hours_templates (user_id, day_of_week, start_time, end_time, break_start, break_end, is_day_off)
SELECT id, 1, '09:00', '17:00', '12:00', '12:30', 0 FROM users WHERE slug = 'vilma';

INSERT OR IGNORE INTO working_hours_templates (user_id, day_of_week, start_time, end_time, break_start, break_end, is_day_off)
SELECT id, 2, '09:00', '17:00', '12:00', '12:30', 0 FROM users WHERE slug = 'vilma';

INSERT OR IGNORE INTO working_hours_templates (user_id, day_of_week, start_time, end_time, break_start, break_end, is_day_off)
SELECT id, 3, '09:00', '17:00', '12:00', '12:30', 0 FROM users WHERE slug = 'vilma';

INSERT OR IGNORE INTO working_hours_templates (user_id, day_of_week, start_time, end_time, break_start, break_end, is_day_off)
SELECT id, 4, '09:00', '17:00', '12:00', '12:30', 0 FROM users WHERE slug = 'vilma';

INSERT OR IGNORE INTO working_hours_templates (user_id, day_of_week, start_time, end_time, break_start, break_end, is_day_off)
SELECT id, 5, '09:00', '17:00', '12:00', '12:30', 0 FROM users WHERE slug = 'vilma';

INSERT OR IGNORE INTO working_hours_templates (user_id, day_of_week, start_time, end_time, break_start, break_end, is_day_off)
SELECT id, 6, NULL, NULL, NULL, NULL, 1 FROM users WHERE slug = 'vilma';

INSERT OR IGNORE INTO working_hours_templates (user_id, day_of_week, start_time, end_time, break_start, break_end, is_day_off)
SELECT id, 0, NULL, NULL, NULL, NULL, 1 FROM users WHERE slug = 'vilma';

-- Služby pro Vilmu Strakatou (dynamické user_id podle slugu)
DELETE FROM services
WHERE user_id = (SELECT id FROM users WHERE slug = 'vilma');

INSERT OR IGNORE INTO services (user_id, category_id, name, description, price, price_type, duration, is_active, sort_order)
SELECT u.id, c.id, 'Styling, regenerace, mytí a foukaná', '', 350, 'starts_at', 45, 1, 1
FROM users u
JOIN service_categories c ON c.slug = 'damske'
WHERE u.slug = 'vilma';

INSERT OR IGNORE INTO services (user_id, category_id, name, description, price, price_type, duration, is_active, sort_order)
SELECT u.id, c.id, 'Střih', 'Včetně: styling + regenerace + mytí + foukaná.', 560, 'starts_at', 75, 1, 2
FROM users u
JOIN service_categories c ON c.slug = 'damske'
WHERE u.slug = 'vilma';

INSERT OR IGNORE INTO services (user_id, category_id, name, description, price, price_type, duration, is_active, sort_order)
SELECT u.id, c.id, 'Barva', 'Včetně: střih + styling + regenerace + mytí + foukaná.', 1200, 'starts_at', 150, 1, 3
FROM users u
JOIN service_categories c ON c.slug = 'damske'
WHERE u.slug = 'vilma';

INSERT OR IGNORE INTO services (user_id, category_id, name, description, price, price_type, duration, is_active, sort_order)
SELECT u.id, c.id, 'Melír', 'Včetně: střih + styling + regenerace + mytí + foukaná.', 1300, 'starts_at', 180, 1, 4
FROM users u
JOIN service_categories c ON c.slug = 'damske'
WHERE u.slug = 'vilma';

INSERT OR IGNORE INTO services (user_id, category_id, name, description, price, price_type, duration, is_active, sort_order)
SELECT u.id, c.id, 'Pánský střih', '', 290, 'starts_at', 35, 1, 1
FROM users u
JOIN service_categories c ON c.slug = 'panske'
WHERE u.slug = 'vilma';

INSERT OR IGNORE INTO services (user_id, category_id, name, description, price, price_type, duration, is_active, sort_order)
SELECT u.id, c.id, 'Pánský střih + styling', 'Včetně: mytí + foukaná.', 390, 'starts_at', 50, 1, 2
FROM users u
JOIN service_categories c ON c.slug = 'panske'
WHERE u.slug = 'vilma';

INSERT OR IGNORE INTO services (user_id, category_id, name, description, price, price_type, duration, is_active, sort_order)
SELECT u.id, c.id, 'Střih strojkem', '', 220, 'fixed', 20, 1, 3
FROM users u
JOIN service_categories c ON c.slug = 'panske'
WHERE u.slug = 'vilma';

INSERT OR IGNORE INTO services (user_id, category_id, name, description, price, price_type, duration, is_active, sort_order)
SELECT u.id, c.id, 'Dětský střih', '', 290, 'starts_at', 35, 1, 1
FROM users u
JOIN service_categories c ON c.slug = 'detske'
WHERE u.slug = 'vilma';

-- Galerie
INSERT OR IGNORE INTO gallery_images (url, alt_text, slot_index) VALUES
('/images/gallery/1.jpg', 'Kadeřnická práce 1', 1),
('/images/gallery/2.jpg', 'Kadeřnická práce 2', 2),
('/images/gallery/3.jpg', 'Kadeřnická práce 3', 3),
('/images/gallery/4.jpg', 'Kadeřnická práce 4', 4),
('/images/gallery/5.jpg', 'Kadeřnická práce 5', 5),
('/images/gallery/6.jpg', 'Kadeřnická práce 6', 6);
