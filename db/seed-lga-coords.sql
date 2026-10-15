-- ============================================================
-- RAVENCRY Seed LGA Coordinates
-- Active LGAs coordinates cache for geofencing during development
-- ============================================================

INSERT INTO lga_coords (lga, state, lat, lng) VALUES
('Ikeja', 'Lagos', 6.6018, 3.3515),
('Eti-Osa', 'Lagos', 6.4350, 3.4880),
('Alimosho', 'Lagos', 6.6080, 3.2500),
('Kaduna North', 'Kaduna', 10.5333, 7.4333),
('Kano Municipal', 'Kano', 11.9964, 8.5167),
('Fagge', 'Kano', 12.0250, 8.5350),
('Abuja Municipal', 'Federal Capital Territory', 9.0578, 7.4951),
('Bwari', 'Federal Capital Territory', 9.2780, 7.3780)
ON CONFLICT (lga, state) DO UPDATE 
SET lat = EXCLUDED.lat, lng = EXCLUDED.lng;
