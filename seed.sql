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
('contact_email', 'info@studionatali.cz', 'Hlavní email studia', 'general'),
('contact_phone', '+420 774 889 606', 'Hlavní telefon', 'general'),
('require_email_verification', 'false', 'Vyžadovat ověření emailu', 'workflow');

-- Uživatelé (heslo je hashované - pro produkci změnit!)
-- Password: admin123 -> hash generován pomocí bcrypt
INSERT OR IGNORE INTO users (email, password_hash, name, slug, role, bio, phone, image, color) VALUES
('admin0', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.4SxKnXdFzBNGGm', 'Administrátor', 'admin', 'superadmin', 'Správce systému', '', '', '#000000'),
('natali0', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.4SxKnXdFzBNGGm', 'Natálie', 'natalie', 'admin', 'Majitelka a hlavní kadeřnice s více než 10 lety praxe.', '+420 774 889 606', '/images/team/natalie.jpg', '#ec4899'),
('vilma0', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.4SxKnXdFzBNGGm', 'Vilma', 'vilma', 'user', 'Specialistka na barvení a moderní střihy.', '+420 123 456 789', '/images/team/vilma.jpg', '#8b5cf6');

-- Pracovní doba pro Natálii (user_id = 1)
INSERT OR IGNORE INTO working_hours_templates (user_id, day_of_week, start_time, end_time, break_start, break_end, is_day_off) VALUES
(1, 1, '08:30', '18:00', '12:00', '12:30', 0),
(1, 2, '08:30', '18:00', '12:00', '12:30', 0),
(1, 3, '08:30', '18:00', '12:00', '12:30', 0),
(1, 4, '08:30', '18:00', '12:00', '12:30', 0),
(1, 5, '08:30', '18:00', '12:00', '12:30', 0),
(1, 6, NULL, NULL, NULL, NULL, 1),
(1, 0, NULL, NULL, NULL, NULL, 1);

-- Pracovní doba pro Vilmu (user_id = 2)
INSERT OR IGNORE INTO working_hours_templates (user_id, day_of_week, start_time, end_time, break_start, break_end, is_day_off) VALUES
(2, 1, '09:00', '17:00', '12:00', '12:30', 0),
(2, 2, '09:00', '17:00', '12:00', '12:30', 0),
(2, 3, '09:00', '17:00', '12:00', '12:30', 0),
(2, 4, '09:00', '17:00', '12:00', '12:30', 0),
(2, 5, '09:00', '17:00', '12:00', '12:30', 0),
(2, 6, NULL, NULL, NULL, NULL, 1),
(2, 0, NULL, NULL, NULL, NULL, 1);

-- Služby pro Natálii
INSERT OR IGNORE INTO services (user_id, category_id, name, description, price, price_type, duration, is_active, sort_order) VALUES
(1, 1, 'Dámský střih', 'Kompletní střih včetně mytí a foukané', 450, 'fixed', 60, 1, 1),
(1, 1, 'Pánský střih', 'Klasický pánský střih', 300, 'fixed', 30, 1, 2),
(1, 1, 'Dětský střih', 'Střih pro děti do 12 let', 250, 'fixed', 30, 1, 3),
(1, 2, 'Barvení - krátké vlasy', 'Barvení krátkých vlasů', 800, 'starts_at', 90, 1, 1),
(1, 2, 'Barvení - dlouhé vlasy', 'Barvení dlouhých vlasů', 1200, 'starts_at', 120, 1, 2),
(1, 2, 'Melír', 'Profesionální melír', 1500, 'starts_at', 150, 1, 3),
(1, 3, 'Keratinové ošetření', 'Hloubková regenerace vlasů', 2000, 'starts_at', 120, 1, 1),
(1, 4, 'Společenský účes', 'Účes pro speciální příležitosti', 800, 'starts_at', 60, 1, 1);

-- Služby pro Vilmu
INSERT OR IGNORE INTO services (user_id, category_id, name, description, price, price_type, duration, is_active, sort_order) VALUES
(2, 1, 'Dámský střih', 'Kompletní střih včetně mytí a foukané', 400, 'fixed', 60, 1, 1),
(2, 1, 'Pánský střih', 'Klasický pánský střih', 280, 'fixed', 30, 1, 2),
(2, 2, 'Barvení', 'Profesionální barvení', 900, 'starts_at', 90, 1, 1),
(2, 2, 'Balayage', 'Moderní technika barvení', 1800, 'starts_at', 180, 1, 2);

-- Galerie
INSERT OR IGNORE INTO gallery_images (url, alt_text, slot_index) VALUES
('/images/gallery/1.jpg', 'Kadeřnická práce 1', 1),
('/images/gallery/2.jpg', 'Kadeřnická práce 2', 2),
('/images/gallery/3.jpg', 'Kadeřnická práce 3', 3),
('/images/gallery/4.jpg', 'Kadeřnická práce 4', 4),
('/images/gallery/5.jpg', 'Kadeřnická práce 5', 5),
('/images/gallery/6.jpg', 'Kadeřnická práce 6', 6);
