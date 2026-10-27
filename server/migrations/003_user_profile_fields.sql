-- Migration 003: User Profile & Skill Fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS college TEXT DEFAULT 'State University';
ALTER TABLE users ADD COLUMN IF NOT EXISTS year_of_study INT DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{"React","JavaScript","Python"}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- Update existing student demo with verified campus skills
UPDATE users 
SET skills = '{"React","Node.js","TypeScript","Python"}' 
WHERE email = 'student@uni.edu';
