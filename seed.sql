-- Studio Natali - Seed Data

-- Kategorie služeb
INSERT OR IGNORE INTO service_categories (name, slug, icon, sort_order) VALUES
('Střih', 'strih', 'Scissors', 10),
('Barva', 'barva', 'Palette', 20),
('Péče', 'pece', 'Sparkles', 30),
('Styling', 'styling', 'Wind', 40);

-- Nastavení
INSERT OR IGNORE INTO settings (key, value, description, category) VALUES
('workflow_require_provider_approval', 'true', 'Vyžadovat schválení kadeřnicí', 'workflow'),
('workflow_send_sms', 'false', 'Odesílat SMS notifikace', 'workflow'),
('cancellation_hours_limit', '24', 'Kolik hodin předem lze zrušit', 'workflow'),
('contact_email', 'info@studionatali-ricany.cz', 'Hlavní email studia', 'general'),
('contact_phone', '+420 774 889 606', 'Hlavní telefon', 'general'),
('salon_name', 'Studio Natali', 'Název salonu', 'general'),
('address', 'Černokostelecká 80/42\n251 01 Říčany u Prahy', 'Adresa salonu', 'general'),
('booking_window', '30', 'Počet dnů dopředu pro rezervaci', 'workflow'),
('require_email_verification', 'false', 'Vyžadovat ověření emailu', 'workflow'),
('sms_daily_limit', '20', 'Maximální počet SMS za den', 'workflow');

-- Uživatelé (heslo je hashované - pro produkci změnit!)
-- Password: admin123 -> hash generován pomocí PBKDF2 (pro produkci změnit!)
INSERT OR IGNORE INTO users (email, password_hash, name, slug, role, bio, phone, image, color) VALUES
('admin0', 'pbkdf2:4G8VyW4_I6T66rwkwmesXg:_KFQXJfHU8xT6J1a86YdJYGM-Kc_qXrU8l3OqqzJGW8', 'Administrátor', 'admin', 'superadmin', 'Správce systému', '', '', '#000000'),
('natali0', 'pbkdf2:4G8VyW4_I6T66rwkwmesXg:_KFQXJfHU8xT6J1a86YdJYGM-Kc_qXrU8l3OqqzJGW8', 'Natálie', 'natalie', 'user', 'Majitelka salonu.', '+420 774 889 606', '/images/team/natalie.jpg', '#ec4899'),
('info@studionatali-ricany.cz', 'pbkdf2:4G8VyW4_I6T66rwkwmesXg:_KFQXJfHU8xT6J1a86YdJYGM-Kc_qXrU8l3OqqzJGW8', 'Vilma Strakatá', 'vilma', 'user', 'Specialistka na barvení a moderní střihy.', '+420 728 814 712', '/images/team/vilma.jpg', '#8b5cf6');

-- Oprava legacy účtů po migraci (bcrypt + starý login vilma0)
UPDATE users
SET password_hash = 'pbkdf2:4G8VyW4_I6T66rwkwmesXg:_KFQXJfHU8xT6J1a86YdJYGM-Kc_qXrU8l3OqqzJGW8'
WHERE email IN ('admin0', 'natali0', 'vilma0', 'info@studionatali-ricany.cz')
	AND (password_hash LIKE '$2a$%' OR password_hash LIKE '$2b$%');

UPDATE users
SET email = 'info@studionatali-ricany.cz'
WHERE slug = 'vilma' AND email = 'vilma0';

-- Pracovní doba pro Vilmu Strakatou (user_id = 3)
INSERT OR IGNORE INTO working_hours_templates (user_id, day_of_week, start_time, end_time, break_start, break_end, is_day_off) VALUES
(3, 1, '09:00', '17:00', '12:00', '12:30', 0),
(3, 2, '09:00', '17:00', '12:00', '12:30', 0),
(3, 3, '09:00', '17:00', '12:00', '12:30', 0),
(3, 4, '09:00', '17:00', '12:00', '12:30', 0),
(3, 5, '09:00', '17:00', '12:00', '12:30', 0),
(3, 6, NULL, NULL, NULL, NULL, 1),
(3, 0, NULL, NULL, NULL, NULL, 1);

-- Služby pro Vilmu Strakatou (user_id = 3)
INSERT OR IGNORE INTO services (user_id, category_id, name, description, price, price_type, duration, is_active, sort_order) VALUES
(3, 1, 'Dámský střih', 'Kompletní střih včetně mytí a foukané', 400, 'fixed', 60, 1, 1),
(3, 1, 'Pánský střih', 'Klasický pánský střih', 280, 'fixed', 30, 1, 2),
(3, 1, 'Dětský střih', 'Střih pro děti do 12 let', 250, 'fixed', 30, 1, 3),
(3, 2, 'Barvení - krátké vlasy', 'Barvení krátkých vlasů', 800, 'starts_at', 90, 1, 1),
(3, 2, 'Barvení - dlouhé vlasy', 'Barvení dlouhých vlasů', 1200, 'starts_at', 120, 1, 2),
(3, 2, 'Melír', 'Profesionální melír', 1500, 'starts_at', 150, 1, 3),
(3, 2, 'Balayage', 'Moderní technika barvení', 1800, 'starts_at', 180, 1, 4),
(3, 3, 'Keratinové ošetření', 'Hloubková regenerace vlasů', 2000, 'starts_at', 120, 1, 1),
(3, 4, 'Společenský účes', 'Účes pro speciální příležitosti', 800, 'starts_at', 60, 1, 1);

-- Galerie
INSERT OR IGNORE INTO gallery_images (url, alt_text, slot_index) VALUES
('/images/gallery/1.jpg', 'Kadeřnická práce 1', 1),
('/images/gallery/2.jpg', 'Kadeřnická práce 2', 2),
('/images/gallery/3.jpg', 'Kadeřnická práce 3', 3),
('/images/gallery/4.jpg', 'Kadeřnická práce 4', 4),
('/images/gallery/5.jpg', 'Kadeřnická práce 5', 5),
('/images/gallery/6.jpg', 'Kadeřnická práce 6', 6);
