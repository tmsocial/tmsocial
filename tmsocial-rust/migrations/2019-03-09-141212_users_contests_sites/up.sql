CREATE TABLE sites (
  id SERIAL PRIMARY KEY,
  domain VARCHAR NOT NULL);

CREATE UNIQUE INDEX sites_domain_unique ON sites(domain);

CREATE TABLE contests (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL);

CREATE UNIQUE INDEX contests_name_unique ON contests(site_id, name);

ALTER TABLE tasks
ADD COLUMN contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  username VARCHAR NOT NULL);

CREATE UNIQUE INDEX users_username_unique ON users(username);

CREATE TABLE participations (
  id SERIAL PRIMARY KEY,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE);

CREATE UNIQUE INDEX participations_contest_user_unique ON participations(contest_id, user_id);